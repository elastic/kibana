/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from 'src/core/server';
import { PdfMaker } from './pdfmaker';
import type { Layout } from '../../../layouts';
import { getTracker } from './tracker';
import { ScreenshotResult } from '../../../screenshots';

interface PngsToPdfArgs {
  results: ScreenshotResult['results'];
  layout: Layout;
  logger: Logger;
  logo?: string;
  title?: string;
}

export async function pngsToPdf({
  results,
  layout,
  logo,
  title,
  logger,
}: PngsToPdfArgs): Promise<{ buffer: Buffer; pageCount: number }> {
  const pdfMaker = new PdfMaker(layout, logo, logger);
  const tracker = getTracker();
  if (title) {
    pdfMaker.setTitle(title);
  }
  results.forEach((result) => {
    result.screenshots.forEach((png) => {
      tracker.startAddImage();
      pdfMaker.addImage(png.data, {
        title: png.title ?? undefined,
        description: png.description ?? undefined,
      });
      tracker.endAddImage();
    });
  });

  let buffer: Uint8Array | null = null;
  try {
    tracker.startCompile();
    buffer = await pdfMaker.generate();
    tracker.endCompile();

    const byteLength = buffer?.byteLength ?? 0;
    logger.debug(`PDF buffer byte length: ${byteLength}`);
    tracker.setByteLength(byteLength);
  } catch (err) {
    throw err;
  } finally {
    tracker.end();
  }

  return { buffer: Buffer.from(buffer.buffer), pageCount: pdfMaker.getPageCount() };
}
