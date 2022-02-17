/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import type { Logger } from 'src/core/server';
import type { HeadlessChromiumDriver } from '../browsers';
import type { Layout } from '../layouts';
import { CONTEXT_GETRENDERERRORS } from './constants';

export const getRenderErrors = async (
  browser: HeadlessChromiumDriver,
  logger: Logger,
  layout: Layout
): Promise<undefined | string[]> => {
  const span = apm.startSpan('get_render_errors', 'read');
  logger.debug('reading render errors');
  const errorsFound: undefined | string[] = await browser.evaluate(
    {
      fn: (errorSelector, errorAttribute) => {
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
  span?.end();

  if (errorsFound?.length) {
    logger.warn(
      `Found ${errorsFound.length} error messages. See report object for more information.`
    );
  }

  return errorsFound;
};
