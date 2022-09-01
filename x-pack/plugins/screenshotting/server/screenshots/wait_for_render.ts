/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HeadlessChromiumDriver } from '../browsers';
import { Layout } from '../layouts';
import { CONTEXT_WAITFORRENDER } from './constants';
import { Actions, EventLogger } from './event_logger';

export const waitForRenderComplete = async (
  browser: HeadlessChromiumDriver,
  eventLogger: EventLogger,
  layout: Layout
) => {
  const spanEnd = eventLogger.logScreenshottingEvent(
    'wait for render complete',
    Actions.WAIT_RENDER,
    'wait'
  );

  await browser.evaluate(
    {
      fn: async (selector) => {
        const visualizations: NodeListOf<Element> = document.querySelectorAll(selector);
        const visCount = visualizations.length;
        const renderedTasks = [];

        function waitForRender(visualization: Element) {
          return new Promise<void>((resolve) => {
            visualization.addEventListener('renderComplete', () => resolve());
          });
        }

        for (let i = 0; i < visCount; i++) {
          const visualization = visualizations[i];
          const isRendered = visualization.getAttribute('data-render-complete');

          if (isRendered === 'disabled') {
            renderedTasks.push(Promise.resolve());
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
        // FIXME?
        // const hackyWaitForVisualizations = () => new Promise((r) => setTimeout(r, 250));

        return await Promise.all(renderedTasks);
      },
      args: [layout.selectors.renderComplete],
    },
    { context: CONTEXT_WAITFORRENDER },
    eventLogger.kbnLogger
  );

  spanEnd();
};
