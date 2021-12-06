/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import apm from 'elastic-apm-node';
import type { Logger } from 'src/core/server';
import type { HeadlessChromiumDriver } from '../browsers';
import { Layout } from '../layouts';
import { CONTEXT_WAITFORELEMENTSTOBEINDOM } from './constants';

interface CompletedItemsCountParameters {
  context: string;
  count: number;
  renderCompleteSelector: string;
}

const getCompletedItemsCount = ({
  context,
  count,
  renderCompleteSelector,
}: CompletedItemsCountParameters) => {
  const { length } = document.querySelectorAll(renderCompleteSelector);

  // eslint-disable-next-line no-console
  console.debug(`evaluate ${context}: waitng for ${count} elements, got ${length}.`);

  return length >= count;
};

/*
 * 1. Wait for the visualization metadata to be found in the DOM
 * 2. Read the metadata for the number of visualization items
 * 3. Wait for the render complete event to be fired once for each item
 */
export const waitForVisualizations = async (
  browser: HeadlessChromiumDriver,
  logger: Logger,
  timeout: number,
  toEqual: number,
  layout: Layout
): Promise<void> => {
  const span = apm.startSpan('wait_for_visualizations', 'wait');
  const { renderComplete: renderCompleteSelector } = layout.selectors;

  logger.debug(
    i18n.translate('xpack.screenshotting.screencapture.waitingForRenderedElements', {
      defaultMessage: `waiting for {itemsCount} rendered elements to be in the DOM`,
      values: { itemsCount: toEqual },
    })
  );

  try {
    await browser.waitFor({
      fn: getCompletedItemsCount,
      args: [{ renderCompleteSelector, context: CONTEXT_WAITFORELEMENTSTOBEINDOM, count: toEqual }],
      timeout,
    });

    logger.debug(`found ${toEqual} rendered elements in the DOM`);
  } catch (err) {
    logger.error(err);
    throw new Error(
      i18n.translate('xpack.screenshotting.screencapture.couldntFinishRendering', {
        defaultMessage: `An error occurred when trying to wait for {count} visualizations to finish rendering. {error}`,
        values: { count: toEqual, error: err },
      })
    );
  }

  span?.end();
};
