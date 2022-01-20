/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import * as Rx from 'rxjs';
import { finalize, map, tap } from 'rxjs/operators';
import { LayoutTypes } from '../../../../screenshotting/common';
import { REPORTING_TRANSACTION_TYPE } from '../../../common/constants';
import { ReportingCore } from '../../';
import { ScreenshotOptions } from '../../types';
import { LevelLogger } from '../../lib';

export function generatePngObservable(
  reporting: ReportingCore,
  logger: LevelLogger,
  options: ScreenshotOptions
): Rx.Observable<{ buffer: Buffer; warnings: string[] }> {
  const apmTrans = apm.startTransaction('generate-png', REPORTING_TRANSACTION_TYPE);
  const apmLayout = apmTrans?.startSpan('create-layout', 'setup');
  if (!options.layout.dimensions) {
    throw new Error(`LayoutParams.Dimensions is undefined.`);
  }
  const layout = {
    id: LayoutTypes.PRESERVE_LAYOUT,
    ...options.layout,
  };

  apmLayout?.end();

  const apmScreenshots = apmTrans?.startSpan('screenshots_pipeline', 'setup');
  let apmBuffer: typeof apm.currentSpan;

  return reporting.getScreenshots({ ...options, layout }).pipe(
    tap(({ metrics$ }) => {
      metrics$.subscribe(({ cpu, memory }) => {
        apmTrans?.setLabel('cpu', cpu, false);
        apmTrans?.setLabel('memory', memory, false);
      });
      apmScreenshots?.end();
      apmBuffer = apmTrans?.startSpan('get-buffer', 'output') ?? null;
    }),
    map(({ results }) => ({
      buffer: results[0].screenshots[0].data,
      warnings: results.reduce((found, current) => {
        if (current.error) {
          found.push(current.error.message);
        }
        if (current.renderErrors) {
          found.push(...current.renderErrors);
        }
        return found;
      }, [] as string[]),
    })),
    tap(({ buffer }) => {
      logger.debug(`PNG buffer byte length: ${buffer.byteLength}`);
      apmTrans?.setLabel('byte_length', buffer.byteLength, false);
    }),
    finalize(() => {
      apmBuffer?.end();
      apmTrans?.end();
    })
  );
}
