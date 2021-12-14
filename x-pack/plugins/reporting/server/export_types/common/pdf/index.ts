/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
// @ts-ignore: no module definition
import concat from 'concat-stream';
import { Worker } from 'worker_threads';
import _ from 'lodash';
import path from 'path';
import Printer from 'pdfmake';
import { SerializableRecord } from '@kbn/utility-types';
import { Content, ContentImage, ContentText } from 'pdfmake/interfaces';
import type { Layout } from '../../../../../screenshotting/server';
import type { LayoutParams } from '../../../../../screenshotting/common';
import { getDocOptions, REPORTING_TABLE_LAYOUT } from './get_doc_options';
import { getFont } from './get_font';
import { getTemplate } from './get_template';
import { TemplateLayout } from './get_template_copy';

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

const assetPath = path.resolve(__dirname, '..', '..', 'common', 'assets');
const tableBorderWidth = 1;

export class PdfMaker {
  private _layout: Layout;
  private _layoutParams: LayoutParams;
  private _logo: string | undefined;
  private _title: string;
  private _content: Content[];
  private _printer: Printer;
  private _pdfDoc: PDFKit.PDFDocument | undefined;

  private worker?: Worker;

  constructor(layout: Layout, layoutParams: LayoutParams, logo: string | undefined) {
    const fontPath = (filename: string) => path.resolve(assetPath, 'fonts', filename);
    const fonts = {
      Roboto: {
        normal: fontPath('roboto/Roboto-Regular.ttf'),
        bold: fontPath('roboto/Roboto-Medium.ttf'),
        italics: fontPath('roboto/Roboto-Italic.ttf'),
        bolditalics: fontPath('roboto/Roboto-Italic.ttf'),
      },
      'noto-cjk': {
        // Roboto does not support CJK characters, so we'll fall back on this font if we detect them.
        normal: fontPath('noto/NotoSansCJKtc-Regular.ttf'),
        bold: fontPath('noto/NotoSansCJKtc-Medium.ttf'),
        italics: fontPath('noto/NotoSansCJKtc-Regular.ttf'),
        bolditalics: fontPath('noto/NotoSansCJKtc-Medium.ttf'),
      },
    };

    this._layout = layout;
    this._layoutParams = layoutParams;
    this._logo = logo;
    this._title = '';
    this._content = [];
    this._printer = new Printer(fonts);
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

  generate(): Promise<Buffer> {
    // const docTemplate = _.assign(
    //   getTemplate(this._layout, this._logo, this._title, tableBorderWidth, assetPath),
    //   {
    //     content: this._content,
    //   }
    // );
    // this._pdfDoc = this._printer.createPdfKitDocument(docTemplate, getDocOptions(tableBorderWidth));
    // return this;

    if (this.worker) throw new Error('PDF generation already in progress!');
    return new Promise((resolve, reject) => {
      const workerData: PdfWorkerData = {
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
      this.worker = new Worker(path.resolve(__dirname, './worker'), { workerData });
      this.worker.on('error', reject);
      this.worker.on('message', (buffer: Buffer) => resolve(buffer));
      this.worker.on('exit', () => {
        this.worker = undefined;
      });
    });
  }

  getBuffer(): Promise<Buffer | null> {
    return new Promise((resolve, reject) => {
      if (!this._pdfDoc) {
        throw new Error(
          i18n.translate(
            'xpack.reporting.exportTypes.printablePdf.documentStreamIsNotgeneratedErrorMessage',
            {
              defaultMessage: 'Document stream has not been generated',
            }
          )
        );
      }

      const concatStream = concat(function (pdfBuffer: Buffer) {
        resolve(pdfBuffer);
      });

      this._pdfDoc.on('error', reject);
      this._pdfDoc.pipe(concatStream);
      this._pdfDoc.end();
    });
  }
}
