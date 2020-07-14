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
import { CONTEXT_WAITFORRENDER } from './constants';

export const waitForRenderComplete = async (
  captureConfig: CaptureConfig,
  browser: HeadlessChromiumDriver,
  layout: LayoutInstance,
  logger: LevelLogger
) => {
  const endTrace = startTrace('wait_for_render', 'wait');

  logger.debug(
    i18n.translate('xpack.reporting.screencapture.waitingForRenderComplete', {
      defaultMessage: 'waiting for rendering to complete',
    })
  );

  return await browser
    .evaluate(
      {
        fn: (selector, visLoadDelay) => {
          // wait for visualizations to finish loading
          const visualizations: NodeListOf<Element> = document.querySelectorAll(selector);
          const visCount = visualizations.length;
          const renderedTasks = [];

          function waitForRender(visualization: Element) {
            return new Promise((resolve) => {
              visualization.addEventListener('renderComplete', () => resolve());
            });
          }

          function waitForRenderDelay() {
            return new Promise((resolve) => {
              setTimeout(resolve, visLoadDelay);
            });
          }

          for (let i = 0; i < visCount; i++) {
            const visualization = visualizations[i];
            const isRendered = visualization.getAttribute('data-render-complete');

            if (isRendered === 'disabled') {
              renderedTasks.push(waitForRenderDelay());
            } else if (isRendered === 'false') {
              renderedTasks.push(waitForRender(visualization));
            }
          }

          // The renderComplete fires before the visualizations are in the DOM, so
          // we wait for the event loop to flush before telling reporting to continue. This
          // seems to correct a timing issue that was causing reporting to occasionally
          // capture the first visualization before it was actually in the DOM.
          // Note: 100 proved too short, see https://github.com/elastic/kibana/issues/22581,
          // bumping to 250.
          const hackyWaitForVisualizations = () => new Promise((r) => setTimeout(r, 250));

          return Promise.all(renderedTasks).then(hackyWaitForVisualizations);
        },
        args: [layout.selectors.renderComplete, captureConfig.loadDelay],
      },
      { context: CONTEXT_WAITFORRENDER },
      logger
    )
    .then(() => {
      logger.debug(
        i18n.translate('xpack.reporting.screencapture.renderIsComplete', {
          defaultMessage: 'rendering is complete',
        })
      );

      endTrace();
    });
};
