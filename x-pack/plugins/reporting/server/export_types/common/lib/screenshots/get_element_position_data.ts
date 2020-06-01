/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { HeadlessChromiumDriver } from '../../../../browsers';
import { LevelLogger, startTrace } from '../../../../lib';
import { AttributesMap, ElementsPositionAndAttribute } from '../../../../types';
import { LayoutInstance } from '../../layouts';
import { CONTEXT_ELEMENTATTRIBUTES } from './constants';

export const getElementPositionAndAttributes = async (
  browser: HeadlessChromiumDriver,
  layout: LayoutInstance,
  logger: LevelLogger
): Promise<ElementsPositionAndAttribute[] | null> => {
  const endTrace = startTrace('get_element_position_data', 'read');
  const { screenshot: screenshotSelector } = layout.selectors; // data-shared-items-container
  let elementsPositionAndAttributes: ElementsPositionAndAttribute[] | null;
  try {
    elementsPositionAndAttributes = await browser.evaluate(
      {
        fn: (selector, attributes) => {
          const elements: NodeListOf<Element> = document.querySelectorAll(selector);

          // NodeList isn't an array, just an iterator, unable to use .map/.forEach
          const results: ElementsPositionAndAttribute[] = [];
          for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const boundingClientRect = element.getBoundingClientRect() as DOMRect;
            results.push({
              position: {
                boundingClientRect: {
                  // modern browsers support x/y, but older ones don't
                  top: boundingClientRect.y || boundingClientRect.top,
                  left: boundingClientRect.x || boundingClientRect.left,
                  width: boundingClientRect.width,
                  height: boundingClientRect.height,
                },
                scroll: {
                  x: window.scrollX,
                  y: window.scrollY,
                },
              },
              attributes: Object.keys(attributes).reduce((result: AttributesMap, key) => {
                const attribute = attributes[key];
                (result as any)[key] = element.getAttribute(attribute);
                return result;
              }, {} as AttributesMap),
            });
          }
          return results;
        },
        args: [screenshotSelector, { title: 'data-title', description: 'data-description' }],
      },
      { context: CONTEXT_ELEMENTATTRIBUTES },
      logger
    );

    if (!elementsPositionAndAttributes || elementsPositionAndAttributes.length === 0) {
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
