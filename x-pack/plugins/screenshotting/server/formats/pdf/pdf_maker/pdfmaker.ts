/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, PackageInfo } from 'src/core/server';
import { SerializableRecord } from '@kbn/utility-types';
import path from 'path';
import { Content, ContentImage, ContentText } from 'pdfmake/interfaces';
import { MessageChannel, MessagePort, Worker } from 'worker_threads';
import type { Layout } from '../../../layouts';
import { errors } from '../../../../common';
import {
  headingHeight,
  pageMarginBottom,
  pageMarginTop,
  pageMarginWidth,
  subheadingHeight,
  tableBorderWidth,
} from './constants';
import { REPORTING_TABLE_LAYOUT } from './get_doc_options';
import { getFont } from './get_font';
import type { GeneratePdfRequest, GeneratePdfResponse, WorkerData } from './worker';

// Ensure that all dependencies are included in the release bundle.
import './worker_dependencies';

export class PdfMaker {
  private title: string;
  private content: Content[];

  private worker?: Worker;
  private pageCount: number = 0;

  protected workerModulePath: string;

  /**
   * The maximum heap size for old memory region of the worker thread.
   *
   * @note We need to provide a sane number given that we need to load a
   * node environment for TS compilation (dev-builds only), some library code
   * and buffers that result from generating a PDF.
   *
   * Local testing indicates that to trigger an OOM event for the worker we need
   * to exhaust not only heap but also any compression optimization and fallback
   * swap space.
   *
   * With this value we are able to generate PDFs in excess of 5000x5000 pixels
   * at which point issues other than memory start to show like glitches in the
   * image.
   */
  protected workerMaxOldHeapSizeMb = 128;

  /**
   * The maximum heap size for young memory region of the worker thread.
   *
   * @note we leave this 'undefined' to use the Node.js default value.
   * @note we set this to a low value to trigger an OOM event sooner for the worker
   * in test scenarios.
   */
  protected workerMaxYoungHeapSizeMb: number | undefined = undefined;

  constructor(
    private readonly layout: Layout,
    private readonly logo: string | undefined,
    { dist }: PackageInfo, // FIXME: is this even needed?
    private readonly logger: Logger
  ) {
    this.title = '';
    this.content = [];

    // running in dist: `worker.ts` becomes `worker.js`
    // running in source: `worker.ts` needs to be wrapped in JS and have a ts-node environment initialized.
    if (dist) {
      this.workerModulePath = path.resolve(__dirname, './worker.js');
    } else {
      this.workerModulePath = path.resolve(__dirname, './worker_src_harness.js');
    }
  }

  _addContents(contents: Content[]) {
    const groupCount = this.content.length;

    // inject a page break for every 2 groups on the page
    if (groupCount > 0 && groupCount % this.layout.groupCount === 0) {
      contents = [
        {
          text: '',
          pageBreak: 'after',
        } as ContentText as Content,
      ].concat(contents);
    }
    this.content.push(contents);
  }

  addBrandedImage(img: ContentImage, { title = '', description = '' }) {
    const contents: Content[] = [];

    if (title && title.length > 0) {
      contents.push({
        text: title,
        style: 'heading',
        font: getFont(title),
        noWrap: false,
      });
    }

    if (description && description.length > 0) {
      contents.push({
        text: description,
        style: 'subheading',
        font: getFont(description),
        noWrap: false,
      });
    }

    const wrappedImg = {
      table: {
        body: [[img]],
      },
      layout: REPORTING_TABLE_LAYOUT,
    };

    contents.push(wrappedImg);

    this._addContents(contents);
  }

  addImage(
    image: Buffer,
    opts: { title?: string; description?: string } = { title: '', description: '' }
  ) {
    this.logger.debug(`Adding image to PDF. Image size: ${image.byteLength}`); // prettier-ignore
    const size = this.layout.getPdfImageSize();
    const img = {
      image: `data:image/png;base64,${image.toString('base64')}`,
      alignment: 'center' as 'center',
      height: size.height,
      width: size.width,
    };

    if (this.layout.useReportingBranding) {
      return this.addBrandedImage(img, opts);
    }

    this._addContents([img]);
  }

  setTitle(title: string) {
    this.title = title;
  }

  private getGeneratePdfRequestData(): GeneratePdfRequest['data'] {
    return {
      layout: {
        hasHeader: this.layout.hasHeader,
        hasFooter: this.layout.hasFooter,
        orientation: this.layout.getPdfPageOrientation(),
        useReportingBranding: this.layout.useReportingBranding,
        pageSize: this.layout.getPdfPageSize({
          pageMarginTop,
          pageMarginBottom,
          pageMarginWidth,
          tableBorderWidth,
          headingHeight,
          subheadingHeight,
        }),
      },
      title: this.title,
      logo: this.logo,
      content: this.content as unknown as SerializableRecord[],
    };
  }

  private createWorker(port: MessagePort): Worker {
    const workerData: WorkerData = {
      port,
    };
    return new Worker(this.workerModulePath, {
      workerData,
      resourceLimits: {
        maxYoungGenerationSizeMb: this.workerMaxYoungHeapSizeMb,
        maxOldGenerationSizeMb: this.workerMaxOldHeapSizeMb,
      },
      transferList: [port],
    });
  }

  private async cleanupWorker(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate().catch(); // best effort
      this.worker = undefined;
    }
  }

  public async generate(): Promise<Uint8Array> {
    if (this.worker) throw new Error('PDF generation already in progress!');

    this.logger.info(`Compiling PDF using "${this.layout.id}" layout...`);

    try {
      return await new Promise<Uint8Array>((resolve, reject) => {
        const { port1: myPort, port2: theirPort } = new MessageChannel();
        this.worker = this.createWorker(theirPort);
        this.worker.on('error', (workerError: NodeJS.ErrnoException) => {
          if (workerError.code === 'ERR_WORKER_OUT_OF_MEMORY') {
            reject(new errors.PdfWorkerOutOfMemoryError(workerError.message));
          } else {
            reject(workerError);
          }
        });
        this.worker.on('exit', () => {});

        // We expect one message from the worker generating the PDF buffer.
        myPort.on('message', ({ error, data }: GeneratePdfResponse) => {
          if (error) {
            reject(new Error(`PDF worker returned the following error: ${error}`));
            return;
          }
          if (!data) {
            reject(new Error(`Worker did not generate a PDF!`));
            return;
          }
          this.pageCount = data.metrics.pages;
          resolve(data.buffer);
        });

        // Send the request
        const generatePdfRequest: GeneratePdfRequest = {
          data: this.getGeneratePdfRequestData(),
        };
        myPort.postMessage(generatePdfRequest);
      });
    } finally {
      await this.cleanupWorker();
    }
  }

  getPageCount(): number {
    return this.pageCount;
  }
}
