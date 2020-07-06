/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { App } from '../components/app';
import { CanvasRenderedWorkpad } from '../types';

export interface Options {
  /**
   * The preferred height to scale the shared workpad.  If only `height` is
   * specified, `width` will be calculated by the workpad ratio.  If both are
   * specified, the ratio will be overriden by an absolute size.
   * @default The height provided by the workpad.
   */
  height?: number;

  /**
   * The preferred width to scale the shared workpad.  If only `width` is
   * specified, `height` will be calculated by the workpad ratio.  If both are
   * specified, the ratio will be overriden by an absolute size.
   * @default The width provided by the workpad.
   */
  width?: number;

  /**
   * The initial page to display.
   * @default The page provided by the workpad.
   */
  page?: number;

  /**
   * Should the runtime automatically move through the pages of the workpad?
   * @default false
   */
  autoplay?: boolean;

  /**
   * The interval upon which the pages will advance in time format, (e.g. 2s, 1m)
   * @default '5s'
   * */
  interval?: string;

  /**
   * Should the toolbar be hidden?
   * @default false
   */
  toolbar?: boolean;
}

// All data attributes start with this prefix.
const PREFIX = 'kbn-canvas';

// The identifying data attribute for all shareable workpads.
const SHAREABLE = `${PREFIX}-shareable`;

// Valid option attributes, preceded by `PREFIX` in markup.
const VALID_ATTRIBUTES = ['url', 'page', 'height', 'width', 'autoplay', 'interval', 'toolbar'];

// Collect and then remove valid data attributes.
const getAttributes = (element: Element, attributes: string[]) => {
  const result: { [key: string]: string } = {};
  attributes.forEach((attribute) => {
    const key = `${PREFIX}-${attribute}`;
    const value = element.getAttribute(key);

    if (value) {
      result[attribute] = value;
      element.removeAttribute(key);
    }
  });

  return result;
};

const getWorkpad = async (url: string): Promise<CanvasRenderedWorkpad | null> => {
  const workpadResponse = await fetch(url);

  if (workpadResponse.ok) {
    return await workpadResponse.json();
  }

  return null;
};

const updateArea = async (area: Element) => {
  const {
    url,
    page: pageAttr,
    height: heightAttr,
    width: widthAttr,
    autoplay,
    interval,
    toolbar,
  } = getAttributes(area, VALID_ATTRIBUTES);

  if (url) {
    const workpad = await getWorkpad(url);

    if (workpad) {
      const page = pageAttr ? parseInt(pageAttr, 10) : null;
      let height = heightAttr ? parseInt(heightAttr, 10) : null;
      let width = widthAttr ? parseInt(widthAttr, 10) : null;

      if (height && !width) {
        // If we have a height but no width, the width should honor the workpad ratio.
        width = Math.round(workpad.width * (height / workpad.height));
      } else if (width && !height) {
        // If we have a width but no height, the height should honor the workpad ratio.
        height = Math.round(workpad.height * (width / workpad.width));
      }

      const stage = {
        height: height || workpad.height,
        width: width || workpad.width,
        page: page !== null ? page : workpad.page,
      };

      const settings = {
        autoplay: {
          isEnabled: !!autoplay,
          interval: interval || '5s',
        },
        toolbar: {
          isAutohide: !!toolbar,
        },
      };

      area.classList.add('kbnCanvas');
      area.removeAttribute(SHAREABLE);

      render(
        [
          <style key="style">{`html body .kbnCanvas { height: ${stage.height}px; width: ${stage.width}px; }`}</style>,
          <App key="app" workpad={workpad} {...{ stage, settings }} />,
        ],
        area
      );
    }
  }
};

/**
 * This function processes all elements that have a valid share data attribute and
 * attempts to place the designated workpad within them.
 */
export const share = () => {
  const shareAreas = document.querySelectorAll(`[${SHAREABLE}]`);
  const validAreas = Array.from(shareAreas).filter(
    (area) => area.getAttribute(SHAREABLE) === 'canvas'
  );

  validAreas.forEach(updateArea);
};
