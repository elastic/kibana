/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy } from 'lodash';
import type { Logger } from 'src/core/server';
import { LayoutParams, LayoutTypes } from '../../../common';
import { ScreenshotResult, ScreenshotOptions } from '../../screenshots';
import { FormattedScreenshotResult } from '../types';
import { pngsToPdf } from './pdf_maker';

const supportedLayouts = [LayoutTypes.PRESERVE_LAYOUT, LayoutTypes.CANVAS, LayoutTypes.PRINT];

/**
 * PDFs can be a single, long page or they can be multiple pages. For example:
 *
 * => When creating a PDF intended for print multiple PNGs will be spread out across pages
 * => When creating a PDF from a Canvas workpad, each page in the workpad will be placed on a separate page
 */
export type PdfLayoutParams = LayoutParams<typeof supportedLayouts[number]>;

/**
 * Options that should be provided to a PDF screenshot request.
 */
export interface PdfScreenshotOptions extends ScreenshotOptions<'pdf'> {
  title?: string;
  logo?: string;
  /**
   * We default to the "print" layout if no ID is specified for the layout
   */
  layout: PdfLayoutParams;
}

/**
 * Final, formatted PDF result
 */
export interface PdfScreenshotResult extends Omit<FormattedScreenshotResult, 'results'> {
  metrics: FormattedScreenshotResult['metrics'] & { pageCount: number };
  result: {
    data: Buffer;
    /**
     * Any errors that were encountered while create the PDF and navigating between pages
     */
    errors: Error[];
    /**
     * Any render errors that could mean some visualizations are missing from the end result.
     */
    renderErrors: string[];
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
        metrics: {
          pageCount,
          ...screenshotResult.metrics!,
        },
        result: {
          data: buffer,
          errors: screenshotResult.results.flatMap((result) =>
            result.error ? [result.error] : []
          ),
          renderErrors: screenshotResult.results.flatMap((result) =>
            result.renderErrors ? [...result.renderErrors] : []
          ),
        },
      };
    } catch (e) {
      logger.error(`Could not generate the PDF buffer!`);
      throw e;
    }
  };
}
