/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { HeadlessChromiumDriver } from '../../../../browsers';
import { LevelLogger, startTrace } from '../../../../lib';
import { CaptureConfig } from '../../../../types';
import { LayoutInstance } from '../../layouts';
import { CONTEXT_WAITFORELEMENTSTOBEINDOM } from './constants';

type SelectorArgs = Record<string, string>;

const getCompletedItemsCount = ({ renderCompleteSelector }: SelectorArgs) => {
  return document.querySelectorAll(renderCompleteSelector).length;
};

/*
 * 1. Wait for the visualization metadata to be found in the DOM
 * 2. Read the metadata for the number of visualization items
 * 3. Wait for the render complete event to be fired once for each item
 */
export const waitForVisualizations = async (
  captureConfig: CaptureConfig,
  browser: HeadlessChromiumDriver,
  itemsCount: number,
  layout: LayoutInstance,
  logger: LevelLogger
): Promise<void> => {
  const endTrace = startTrace('wait_for_visualizations', 'wait');
  const { renderComplete: renderCompleteSelector } = layout.selectors;

  logger.debug(
    i18n.translate('xpack.reporting.screencapture.waitingForRenderedElements', {
      defaultMessage: `waiting for {itemsCount} rendered elements to be in the DOM`,
      values: { itemsCount },
    })
  );

  try {
    await browser.waitFor(
      {
        fn: getCompletedItemsCount,
        args: [{ renderCompleteSelector }],
        toEqual: itemsCount,
        timeout: captureConfig.timeouts.renderComplete,
      },
      { context: CONTEXT_WAITFORELEMENTSTOBEINDOM },
      logger
    );

    logger.debug(`found ${itemsCount} rendered elements in the DOM`);
  } catch (err) {
    throw new Error(
      i18n.translate('xpack.reporting.screencapture.couldntFinishRendering', {
        defaultMessage: `An error occurred when trying to wait for {count} visualizations to finish rendering. You may need to increase '{configKey}'. {error}`,
        values: {
          count: itemsCount,
          configKey: 'xpack.reporting.capture.timeouts.renderComplete',
          error: err,
        },
      })
    );
  }

  endTrace();
};
