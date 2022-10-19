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
import { AttributesMap, ElementsPositionAndAttribute } from './';
import { CONTEXT_ELEMENTATTRIBUTES } from './constants';

export const getElementPositionAndAttributes = async (
  browser: HeadlessChromiumDriver,
  layout: LayoutInstance,
  logger: LevelLogger
): Promise<ElementsPositionAndAttribute[] | null> => {
  const endTrace = startTrace('get_element_position_data', 'read');
  const { screenshot: screenshotSelector } = layout.selectors; // data-shared-items-container
  const screenshotAttributes = { title: 'data-title', description: 'data-description' };

  let elementsPositionAndAttributes: ElementsPositionAndAttribute[] | null;
  try {
    elementsPositionAndAttributes = await browser.evaluate<
      [typeof screenshotSelector, typeof screenshotAttributes],
      ElementsPositionAndAttribute[] | null
    >(
      {
        fn: (selector, attributes) => {
          const elements = Array.from(document.querySelectorAll<Element>(selector));
          const results: ElementsPositionAndAttribute[] = [];

          for (const element of elements) {
            const boundingClientRect = element.getBoundingClientRect() as DOMRect;
            results.push({
              position: {
                boundingClientRect: {
                  top: boundingClientRect.y,
                  left: boundingClientRect.x,
                  width: boundingClientRect.width,
                  height: boundingClientRect.height,
                },
                scroll: {
                  x: window.scrollX,
                  y: window.scrollY,
                },
              },
              attributes: Object.keys(attributes).reduce<AttributesMap>(
                (result: AttributesMap, key) => {
                  const attribute = attributes[key as keyof typeof attributes];
                  result[key] = element.getAttribute(attribute);
                  return result;
                },
                {}
              ),
            });
          }
          return results;
        },
        args: [screenshotSelector, screenshotAttributes],
      },
      { context: CONTEXT_ELEMENTATTRIBUTES },
      logger
    );

    if (!elementsPositionAndAttributes?.length) {
      throw new Error(
        i18n.translate('xpack.reporting.screencapture.noElements', {
          defaultMessage: `An error occurred while reading the page for visualization panels: no panels were found.`,
        })
      );
    }
  } catch (err) {
    elementsPositionAndAttributes = null;
  }

  endTrace();

  return elementsPositionAndAttributes;
};
