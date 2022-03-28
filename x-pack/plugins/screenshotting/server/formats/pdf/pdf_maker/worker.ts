/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ensure, SerializableRecord } from '@kbn/utility-types';

import { isMainThread, MessagePort, workerData } from 'worker_threads';
import path from 'path';

import { getTemplate } from './get_template';
import type { TemplateLayout } from './types';
import { assetPath } from './constants';
import { _, Printer } from './worker_dependencies';

export interface WorkerData {
  port: MessagePort;
}

export type GenerateReportRequestData = Ensure<
  {
    layout: TemplateLayout;
    title: string;
    content: SerializableRecord[];

    logo?: string;
  },
  SerializableRecord
>;

export interface GeneratePdfRequest {
  data: GenerateReportRequestData;
}

export type GeneratePdfResponse = SuccessResponse | ErrorResponse;

export interface SuccessResponse {
  error?: undefined;
  data: {
    buffer: Uint8Array;
    metrics: {
      pages: number;
    };
  };
}

export interface ErrorResponse {
  error: string;
  data: null;
}

console.log('WORKER================> isMainThread', isMainThread);
// if (!isMainThread) {
const { port } = workerData as WorkerData;
console.log('WORKER================> listening for execute request');
port.on('message', execute);
// }

const getPageCount = (pdfDoc: PDFKit.PDFDocument): number => {
  const pageRange = pdfDoc.bufferedPageRange();
  if (!pageRange) {
    return 0;
  }
  const { count, start } = pageRange;

  return start + count;
};

async function execute({ data: { layout, logo, title, content } }: GeneratePdfRequest) {
  const { port } = workerData as WorkerData;
  try {
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

    if (!pdfDoc) {
      throw new Error('Document stream has not been generated');
    }

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const buffers: Buffer[] = [];
      pdfDoc.on('error', reject);
      pdfDoc.on('data', (data: Buffer) => {
        buffers.push(data);
      });
      pdfDoc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      pdfDoc.end();
    });

    const successResponse: SuccessResponse = {
      data: {
        buffer,
        metrics: {
          pages: getPageCount(pdfDoc),
        },
      },
    };
    port.postMessage(successResponse, [buffer.buffer /* Transfer buffer instead of copying */]);
  } catch (error) {
    const errorResponse: ErrorResponse = { error: error.message, data: null };
    port.postMessage(errorResponse);
  } finally {
    process.nextTick(() => {
      process.exit(0);
    });
  }
}
