/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy } from 'lodash';
import type { Logger } from 'src/core/server';
import { ScreenshotOptions, ScreenshotResult } from '../..';
import type { LayoutParams, LayoutTypes } from '../../../common';
import { pngsToPdf } from './pdf_maker';

type LayoutID =
  | typeof LayoutTypes.PRESERVE_LAYOUT
  | typeof LayoutTypes.CANVAS
  | typeof LayoutTypes.PRINT;

/**
 * PDFs can be a single, long page or they can be multiple pages. For example:
 *
 * => When creating a PDF intended for print multiple PNGs will be spread out across pages
 * => When creating a PDF from a Canvas workpad, each page in the workpad will be placed on a separate page
 */
export type PdfLayoutParams = LayoutParams<LayoutID>;

export interface PdfScreenshotOptions extends ScreenshotOptions {
  title?: string;
  logo?: string;
  layout: PdfLayoutParams;
}

export interface PdfScreenshotResult extends Omit<ScreenshotResult, 'results'> {
  metadata: { pageCount: number };
  result: {
    data: Buffer;
  };
}

interface ScreenshotsResultsToPdfArgs {
  logger: Logger;
  title?: string;
  logo?: string;
}

const getTimeRange = (urlScreenshots: ScreenshotResult['results']) => {
  const grouped = groupBy(urlScreenshots.map((u) => u.timeRange));
  const values = Object.values(grouped);
  if (values.length === 1) {
    return values[0][0];
  }

  return null;
};

export function toPdf({ title, logo, logger }: ScreenshotsResultsToPdfArgs) {
  return async (screenshotResult: ScreenshotResult): Promise<PdfScreenshotResult> => {
    const timeRange = getTimeRange(screenshotResult.results);
    try {
      const { buffer, pageCount } = await pngsToPdf({
        results: screenshotResult.results,
        title: title ? title + (timeRange ? ` - ${timeRange}` : '') : undefined,
        logo,
        layout: screenshotResult.layout,
        logger,
      });

      return {
        ...screenshotResult,
        metadata: { pageCount },
        result: {
          data: buffer,
        },
      };
    } catch (e) {
      logger.error(`Could not generate the PDF buffer!`);
      throw e;
    }
  };
}
