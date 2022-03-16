/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SerializableRecord } from '@kbn/utility-types';
import path from 'path';
import { Content, ContentImage, ContentText } from 'pdfmake/interfaces';
import { MessageChannel, MessagePort, Worker } from 'worker_threads';
import type { Layout } from '../../../../../screenshotting/server';
import { PdfWorkerOutOfMemoryError } from '../../../../common/errors';
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
  _layout: Layout;
  private _logo: string | undefined;
  private _title: string;
  private _content: Content[];

  private worker?: Worker;
  private pageCount: number = 0;

  protected workerModulePath = path.resolve(__dirname, './worker.js');

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

  constructor(layout: Layout, logo: string | undefined) {
    this._layout = layout;
    this._logo = logo;
    this._title = '';
    this._content = [];
  }

  _addContents(contents: Content[]) {
    const groupCount = this._content.length;

    // inject a page break for every 2 groups on the page
    if (groupCount > 0 && groupCount % this._layout.groupCount === 0) {
      contents = [
        {
          text: '',
          pageBreak: 'after',
        } as ContentText as Content,
      ].concat(contents);
    }
    this._content.push(contents);
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
    const size = this._layout.getPdfImageSize();
    const img = {
      image: `data:image/png;base64,${image.toString('base64')}`,
      alignment: 'center' as 'center',
      height: size.height,
      width: size.width,
    };

    if (this._layout.useReportingBranding) {
      return this.addBrandedImage(img, opts);
    }

    this._addContents([img]);
  }

  setTitle(title: string) {
    this._title = title;
  }

  private getGeneratePdfRequestData(): GeneratePdfRequest['data'] {
    return {
      layout: {
        hasFooter: this._layout.hasFooter,
        hasHeader: this._layout.hasHeader,
        orientation: this._layout.getPdfPageOrientation(),
        useReportingBranding: this._layout.useReportingBranding,
        pageSize: this._layout.getPdfPageSize({
          pageMarginTop,
          pageMarginBottom,
          pageMarginWidth,
          tableBorderWidth,
          headingHeight,
          subheadingHeight,
        }),
      },
      title: this._title,
      logo: this._logo,
      content: this._content as unknown as SerializableRecord[],
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

    try {
      return await new Promise<Uint8Array>((resolve, reject) => {
        const { port1: myPort, port2: theirPort } = new MessageChannel();
        this.worker = this.createWorker(theirPort);
        this.worker.on('error', (workerError: NodeJS.ErrnoException) => {
          if (workerError.code === 'ERR_WORKER_OUT_OF_MEMORY') {
            reject(new PdfWorkerOutOfMemoryError(workerError.message));
          } else {
            reject(workerError);
          }
        });
        this.worker.on('exit', () => {}); // do nothing on errors

        // Send the initial request
        const generatePdfRequest: GeneratePdfRequest = {
          data: this.getGeneratePdfRequestData(),
        };
        myPort.postMessage(generatePdfRequest);

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
      });
    } finally {
      await this.cleanupWorker();
    }
  }

  getPageCount(): number {
    return this.pageCount;
  }
}
