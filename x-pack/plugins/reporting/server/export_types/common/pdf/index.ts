/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Worker } from 'worker_threads';
import _ from 'lodash';
import path from 'path';
import { SerializableRecord } from '@kbn/utility-types';
import { Content, ContentImage, ContentText } from 'pdfmake/interfaces';
import type { Layout } from '../../../../../screenshotting/server';
import { REPORTING_TABLE_LAYOUT } from './get_doc_options';
import { getFont } from './get_font';

import { PdfWorkerData } from './worker';

const pageMarginTop = 40;
const pageMarginBottom = 80;
const pageMarginWidth = 40;
const headingFontSize = 14;
const headingMarginTop = 10;
const headingMarginBottom = 5;
const headingHeight = headingFontSize * 1.5 + headingMarginTop + headingMarginBottom;
const subheadingFontSize = 12;
const subheadingMarginTop = 0;
const subheadingMarginBottom = 5;
const subheadingHeight = subheadingFontSize * 1.5 + subheadingMarginTop + subheadingMarginBottom;

const tableBorderWidth = 1;

export class PdfMaker {
  private _layout: Layout;
  private _logo: string | undefined;
  private _title: string;
  private _content: Content[];

  private worker?: Worker;

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
        noWrap: true,
      });
    }

    if (description && description.length > 0) {
      contents.push({
        text: description,
        style: 'subheading',
        font: getFont(description),
        noWrap: true,
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

  private getWorkerData(): PdfWorkerData {
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

  generate(): Promise<Buffer> {
    if (this.worker) throw new Error('PDF generation already in progress!');

    return new Promise<Buffer>((resolve, reject) => {
      let buffer: undefined | Buffer;
      this.worker = new Worker(path.resolve(__dirname, './worker.js'), {
        resourceLimits: { maxOldGenerationSizeMb: 150 },
        workerData: this.getWorkerData(),
      });
      this.worker.on('error', reject);

      // We expect one message from the work container the PDF buffer.
      this.worker.on('message', (pdfBuffer: Buffer) => (buffer = pdfBuffer));

      this.worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker exited with code ${code}`));
          return;
        }
        if (buffer) {
          resolve(buffer);
          return;
        }
        reject(new Error('Worker exited without generating a PDF'));
      });
    }).finally(() => {
      this.worker = undefined;
    });
  }
}
