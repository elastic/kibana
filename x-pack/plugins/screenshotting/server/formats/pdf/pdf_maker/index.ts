/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo } from '@kbn/core/server';
import type { Layout } from '../../../layouts';
import type { CaptureResult } from '../../../screenshots';
import { Actions, EventLogger } from '../../../screenshots/event_logger';
import { PdfMaker } from './pdfmaker';

interface PngsToPdfArgs {
  results: CaptureResult['results'];
  layout: Layout;
  packageInfo: PackageInfo;
  eventLogger: EventLogger;
  logo?: string;
  title?: string;
}

export async function pngsToPdf({
  results,
  layout,
  logo,
  title,
  packageInfo,
  eventLogger,
}: PngsToPdfArgs): Promise<{ buffer: Buffer; pages: number }> {
  const transactionEnd = eventLogger.pdfTransaction();
  const pdfMaker = new PdfMaker(layout, logo, packageInfo, eventLogger.kbnLogger);
  if (title) {
    pdfMaker.setTitle(title);
  }
  results.forEach((result) => {
    result.screenshots.forEach((png) => {
      const spanEnd = eventLogger.log(
        'add image to PDF file',
        Actions.ADD_IMAGE,
        'generatePdf',
        'output'
      );
      pdfMaker.addImage(png.data, {
        title: png.title ?? undefined,
        description: png.description ?? undefined,
      });
      spanEnd();
    });
  });

  let buffer: Uint8Array | null = null;
  try {
    const spanEnd = eventLogger.log('compile PDF file', Actions.COMPILE, 'generatePdf', 'output');
    buffer = await pdfMaker.generate();
    spanEnd();

    const byteLength = buffer?.byteLength ?? 0;
    transactionEnd({ byte_length_pdf: byteLength, pdf_pages: pdfMaker.getPageCount() });
  } catch (err) {
    throw err;
  }

  return { buffer: Buffer.from(buffer.buffer), pages: pdfMaker.getPageCount() };
}
