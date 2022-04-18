/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo } from '@kbn/core/server';
import type { Layout } from '../../../layouts';
import type { CaptureResult } from '../../../screenshots';
import { EventLogger } from '../../../screenshots/event_logger';
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
  eventLogger.pdfStart();
  const pdfMaker = new PdfMaker(layout, logo, packageInfo, eventLogger.kbnLogger);
  if (title) {
    pdfMaker.setTitle(title);
  }
  results.forEach((result) => {
    result.screenshots.forEach((png) => {
      eventLogger.addPdfImageStart();
      pdfMaker.addImage(png.data, {
        title: png.title ?? undefined,
        description: png.description ?? undefined,
      });
      eventLogger.addPdfImageEnd();
    });
  });

  let buffer: Uint8Array | null = null;
  try {
    eventLogger.compilePdfStart();
    buffer = await pdfMaker.generate();
    eventLogger.compilePdfEnd();

    const byteLength = buffer?.byteLength ?? 0;
    eventLogger.pdfEnd({ byteLengthPdf: byteLength, pdfPages: pdfMaker.getPageCount() });
  } catch (err) {
    throw err;
  }

  return { buffer: Buffer.from(buffer.buffer), pages: pdfMaker.getPageCount() };
}
