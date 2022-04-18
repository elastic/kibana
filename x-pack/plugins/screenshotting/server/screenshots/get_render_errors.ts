/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HeadlessChromiumDriver } from '../browsers';
import type { Layout } from '../layouts';
import { CONTEXT_GETRENDERERRORS } from './constants';
import { EventLogger } from './event_logger';

export const getRenderErrors = async (
  browser: HeadlessChromiumDriver,
  eventLogger: EventLogger,
  layout: Layout
): Promise<undefined | string[]> => {
  const { kbnLogger: logger } = eventLogger;
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

  if (errorsFound?.length) {
    logger.warn(
      `Found ${errorsFound.length} error messages. See report object for more information.`
    );
  }

  return errorsFound;
};
