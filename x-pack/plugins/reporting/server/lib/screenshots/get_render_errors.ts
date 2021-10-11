/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { HeadlessChromiumDriver } from '../../browsers';
import type { LayoutInstance } from '../layouts';
import { LevelLogger, startTrace } from '../';
import { CONTEXT_GETRENDERERRORS } from './constants';

export const getRenderErrors = async (
  browser: HeadlessChromiumDriver,
  layout: LayoutInstance,
  logger: LevelLogger
): Promise<string[]> => {
  const endTrace = startTrace('get_render_errors', 'read');
  logger.debug('reading render errors');
  const errors: string[] = await browser.evaluate(
    {
      fn: (selector) => {
        const visualizations: Element[] = Array.from(document.querySelectorAll(selector));
        const errorMessages: string[] = [];

        visualizations.forEach((visualization) => {
          const errorMessage = visualization.getAttribute('data-render-error');
          if (errorMessage) {
            errorMessages.push(errorMessage);
          }
        });

        return errorMessages;
      },
      args: [layout.selectors.renderComplete],
    },
    { context: CONTEXT_GETRENDERERRORS },
    logger
  );
  endTrace();

  if (errors.length) {
    logger.warning(
      i18n.translate('xpack.reporting.screencapture.renderErrorsFound', {
        defaultMessage: 'Found {count} error messages. See report object for more information.',
        values: { count: errors.length },
      })
    );
  }

  return errors;
};
