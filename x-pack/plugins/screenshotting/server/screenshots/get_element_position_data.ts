/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HeadlessChromiumDriver } from '../browsers';
import { Layout } from '../layouts';
import { CONTEXT_ELEMENTATTRIBUTES } from './constants';
import { Actions, EventLogger } from './event_logger';

export interface AttributesMap {
  [key: string]: string | null;
}

export interface ElementPosition {
  boundingClientRect: {
    // modern browsers support x/y, but older ones don't
    top: number;
    left: number;
    width: number;
    height: number;
  };
  scroll: {
    x: number;
    y: number;
  };
}

export interface ElementsPositionAndAttribute {
  position: ElementPosition;
  attributes: AttributesMap;
}

export const getElementPositionAndAttributes = async (
  browser: HeadlessChromiumDriver,
  eventLogger: EventLogger,
  layout: Layout
): Promise<ElementsPositionAndAttribute[] | null> => {
  const { kbnLogger } = eventLogger;

  const spanEnd = eventLogger.logScreenshottingEvent(
    'get element position data',
    Actions.GET_ELEMENT_POSITION_DATA,
    'read'
  );

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
                scroll: { x: window.scrollX, y: window.scrollY },
              },
              attributes: Object.keys(attributes).reduce<AttributesMap>((result, key) => {
                const attribute = attributes[key as keyof typeof attributes];
                result[key] = element.getAttribute(attribute);
                return result;
              }, {}),
            });
          }
          return results;
        },
        args: [screenshotSelector, screenshotAttributes],
      },
      { context: CONTEXT_ELEMENTATTRIBUTES },
      kbnLogger
    );

    if (!elementsPositionAndAttributes?.length) {
      throw new Error(
        `An error occurred while reading the page for visualization panels: no panels were found.`
      );
    }
  } catch (err) {
    kbnLogger.error(err);
    eventLogger.error(err, Actions.GET_ELEMENT_POSITION_DATA);
    elementsPositionAndAttributes = null;
    // no throw
  }

  spanEnd({ element_positions: elementsPositionAndAttributes?.length });

  return elementsPositionAndAttributes;
};
