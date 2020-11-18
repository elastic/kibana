/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
// @ts-ignore: no module definition
import concat from 'concat-stream';
import _ from 'lodash';
import path from 'path';
import Printer from 'pdfmake';
import { Content, ContentText } from 'pdfmake/interfaces';
import { LayoutInstance } from '../../../../lib/layouts';
import { getDocOptions } from './get_doc_options';
import { getFont } from './get_font';
import { getTemplate } from './get_template';

const assetPath = path.resolve(__dirname, '..', '..', '..', 'common', 'assets');
const tableBorderWidth = 1;

export class PdfMaker {
  private _layout: LayoutInstance;
  private _logo: string | undefined;
  private _title: string;
  private _content: Content[];
  private _printer: Printer;
  private _pdfDoc: PDFKit.PDFDocument | undefined;

  constructor(layout: LayoutInstance, logo: string | undefined) {
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
        ({
          text: '',
          pageBreak: 'after',
        } as ContentText) as Content,
      ].concat(contents);
    }
    this._content.push(contents);
  }

  addImage(base64EncodedData: string, { title = '', description = '' }) {
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

    const size = this._layout.getPdfImageSize();
    const img = {
      image: `data:image/png;base64,${base64EncodedData}`,
      alignment: 'center',
      height: size.height,
      width: size.width,
    };

    const wrappedImg = {
      table: {
        body: [[img]],
      },
      layout: 'noBorder',
    };

    contents.push(wrappedImg);

    this._addContents(contents);
  }

  setTitle(title: string) {
    this._title = title;
  }

  generate() {
    const docTemplate = _.assign(
      getTemplate(this._layout, this._logo, this._title, tableBorderWidth, assetPath),
      {
        content: this._content,
      }
    );
    this._pdfDoc = this._printer.createPdfKitDocument(docTemplate, getDocOptions(tableBorderWidth));
    return this;
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
