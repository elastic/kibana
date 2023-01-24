/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HeadlessChromiumDriver } from '../browsers';
import { Layout } from '../layouts';
import { CONTEXT_WAITFORELEMENTSTOBEINDOM } from './constants';
import { Actions, EventLogger } from './event_logger';

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
  eventLogger: EventLogger,
  timeout: number,
  toEqual: number,
  layout: Layout
): Promise<void> => {
  const { kbnLogger } = eventLogger;
  const spanEnd = eventLogger.logScreenshottingEvent(
    'waiting for each visualization to complete rendering',
    Actions.WAIT_VISUALIZATIONS,
    'wait'
  );

  const { renderComplete: renderCompleteSelector } = layout.selectors;

  kbnLogger.debug(`waiting for ${toEqual} rendered elements to be in the DOM`);

  try {
    await browser.waitFor<CompletedItemsCountParameters[]>({
      fn: getCompletedItemsCount,
      args: [{ renderCompleteSelector, context: CONTEXT_WAITFORELEMENTSTOBEINDOM, count: toEqual }],
      timeout,
    });

    kbnLogger.debug(`found ${toEqual} rendered elements in the DOM`);
  } catch (err) {
    kbnLogger.error(err);
    const newError = new Error(
      `An error occurred when trying to wait for ${toEqual} visualizations to finish rendering. ${err.message}`
    );
    eventLogger.error(newError, Actions.WAIT_VISUALIZATIONS);
    throw newError;
  }

  spanEnd();
};
