/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { LevelLogger, startTrace } from '../';
import { HeadlessChromiumDriver } from '../../browsers';
import { LayoutInstance } from '../layouts';

interface CompletedItemsCountParameters {
  count: number;
  renderCompleteSelector: string;
}

const getCompletedItemsCount = ({
  count,
  renderCompleteSelector,
}: CompletedItemsCountParameters) => {
  const { length } = document.querySelectorAll(renderCompleteSelector);

  // eslint-disable-next-line no-console
  console.debug(`waitng for ${count} elements, got ${length}.`);

  return length >= count;
};

/*
 * 1. Wait for the visualization metadata to be found in the DOM
 * 2. Read the metadata for the number of visualization items
 * 3. Wait for the render complete event to be fired once for each item
 */
export const waitForVisualizations = async (
  timeout: number,
  browser: HeadlessChromiumDriver,
  toEqual: number,
  layout: LayoutInstance,
  logger: LevelLogger
): Promise<void> => {
  const endTrace = startTrace('wait_for_visualizations', 'wait');
  const { renderComplete: renderCompleteSelector } = layout.selectors;

  logger.debug(`Waiting for ${toEqual} rendered elements to be in the DOM`);

  try {
    await browser.waitFor<CompletedItemsCountParameters[]>({
      fn: getCompletedItemsCount,
      args: [{ renderCompleteSelector, count: toEqual }],
      timeout,
    });

    logger.debug(`found ${toEqual} rendered elements in the DOM`);
  } catch (err) {
    logger.error(err);
    throw new Error(
      i18n.translate('xpack.reporting.screencapture.couldntFinishRendering', {
        defaultMessage: `An error occurred when trying to wait for {count} visualizations to finish rendering. {error}`,
        values: { count: toEqual, error: err },
      })
    );
  }

  endTrace();
};
