/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ensure, SerializableRecord } from '@kbn/utility-types';

import { workerData, parentPort, isMainThread } from 'worker_threads';
import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import path from 'path';
import Printer from 'pdfmake';
// @ts-ignore: no module definition
import concat from 'concat-stream';

import { getTemplate } from './get_template';
import type { TemplateLayout } from './types';

export type PdfWorkerData = Ensure<
  {
    layout: TemplateLayout;
    title: string;
    content: SerializableRecord[];

    logo?: string;
  },
  SerializableRecord
>;

if (!isMainThread) {
  execute();
}

async function execute() {
  const assetPath = path.resolve(__dirname, '..', '..', 'common', 'assets');
  const tableBorderWidth = 1;

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

  const printer = new Printer(fonts);

  const { layout, logo, title, content } = workerData as PdfWorkerData;

  const docDefinition = _.assign(getTemplate(layout, logo, title, tableBorderWidth, assetPath), {
    content,
  });

  const pdfDoc = printer.createPdfKitDocument(docDefinition, {
    tableLayouts: {
      noBorder: {
        // format is function (i, node) { ... };
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
    },
  });

  const buffer = await new Promise((resolve, reject) => {
    if (!pdfDoc) {
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

    pdfDoc.on('error', reject);
    pdfDoc.pipe(concatStream);
    pdfDoc.end();
  });

  parentPort!.postMessage(buffer);
}
