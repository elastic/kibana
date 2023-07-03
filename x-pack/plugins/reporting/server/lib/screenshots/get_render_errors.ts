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
): Promise<undefined | string[]> => {
  const endTrace = startTrace('get_render_errors', 'read');
  logger.debug('reading render errors');
  const errorsFound: undefined | string[] = await browser.evaluate<string[], string[] | undefined>(
    {
      fn: (errorSelector: string, errorAttribute: string) => {
        const visualizations: Element[] = Array.from(document.querySelectorAll(errorSelector));
        const errors: string[] = [];

        visualizations.forEach((visualization) => {
          const errorMessage = visualization.getAttribute(errorAttribute);
          if (errorMessage) {
            errors.push(errorMessage);
          }
        });

        return errors.length ? errors : undefined;
      },
      args: [layout.selectors.renderError, layout.selectors.renderErrorAttribute],
    },
    { context: CONTEXT_GETRENDERERRORS },
    logger
  );
  endTrace();

  if (errorsFound?.length) {
    logger.warning(
      i18n.translate('xpack.reporting.screencapture.renderErrorsFound', {
        defaultMessage: 'Found {count} error messages. See report object for more information.',
        values: { count: errorsFound.length },
      })
    );
  }

  return errorsFound;
};
