/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy } from 'lodash';
import type { Values } from '@kbn/utility-types';
import type { Logger, PackageInfo } from '@kbn/core/server';
import type { LayoutParams } from '../../../common';
import { LayoutTypes } from '../../../common';
import type { Layout } from '../../layouts';
import type { CaptureOptions, CaptureResult, CaptureMetrics } from '../../screenshots';
import { pngsToPdf } from './pdf_maker';

/**
 * PDFs can be a single, long page or they can be multiple pages. For example:
 *
 * => When creating a PDF intended for print multiple PNGs will be spread out across pages
 * => When creating a PDF from a Canvas workpad, each page in the workpad will be placed on a separate page
 */
export type PdfLayoutParams = LayoutParams<
  Values<Pick<typeof LayoutTypes, 'PRESERVE_LAYOUT' | 'CANVAS' | 'PRINT'>>
>;

/**
 * Options that should be provided to a PDF screenshot request.
 */
export interface PdfScreenshotOptions extends CaptureOptions {
  /**
   * Whether to format the output as a PDF.
   */
  format: 'pdf';

  /**
   * Document title.
   */
  title?: string;

  /**
   * Logo at the footer.
   */
  logo?: string;

  /**
   * We default to the "print" layout if no ID is specified for the layout
   */
  layout?: PdfLayoutParams;
}

export interface PdfScreenshotMetrics extends Partial<CaptureMetrics> {
  /**
   * A number of emitted pages in the generated PDF report.
   */
  pages: number;
}

/**
 * Final, formatted PDF result
 */
export interface PdfScreenshotResult {
  /**
   * Collected performance metrics during the screenshotting session along with the PDF generation ones.
   */
  metrics: PdfScreenshotMetrics;

  /**
   * PDF document data buffer.
   */
  data: Buffer;

  /**
   * Any errors that were encountered while create the PDF and navigating between pages
   */
  errors: Error[];

  /**
   * Any render errors that could mean some visualizations are missing from the end result.
   */
  renderErrors: string[];
}

function getTimeRange(results: CaptureResult['results']) {
  const grouped = groupBy(results.map(({ timeRange }) => timeRange));
  const values = Object.values(grouped);
  if (values.length !== 1) {
    return;
  }

  return values[0][0];
}

export async function toPdf(
  logger: Logger,
  packageInfo: PackageInfo,
  layout: Layout,
  { logo, title }: PdfScreenshotOptions,
  { metrics, results }: CaptureResult
): Promise<PdfScreenshotResult> {
  const timeRange = getTimeRange(results);
  let buffer: Buffer;
  let pages: number;
  const shouldConvertPngsToPdf = layout.id !== LayoutTypes.PRINT;
  if (shouldConvertPngsToPdf) {
    try {
      ({ buffer, pages } = await pngsToPdf({
        title: title ? `${title}${timeRange ? ` - ${timeRange}` : ''}` : undefined,
        results,
        layout,
        logo,
        packageInfo,
        logger,
      }));

      return {
        metrics: {
          ...(metrics ?? {}),
          pages,
        },
        data: buffer,
        errors: results.flatMap(({ error }) => (error ? [error] : [])),
        renderErrors: results.flatMap(({ renderErrors }) => renderErrors ?? []),
      };
    } catch (error) {
      logger.error(`Could not generate the PDF buffer!`);

      throw error;
    }
  } else {
    buffer = results[0].screenshots[0].data;
    pages = -1; // TODO: Figure out how to get page numbers
  }

  return {
    metrics: {
      ...(metrics ?? {}),
      pages,
    },
    data: buffer,
    errors: results.flatMap(({ error }) => (error ? [error] : [])),
    renderErrors: results.flatMap(({ renderErrors }) => renderErrors ?? []),
  };
}
