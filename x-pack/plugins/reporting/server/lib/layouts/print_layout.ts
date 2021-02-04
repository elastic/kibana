/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { PageOrientation, PredefinedPageSize } from 'pdfmake/interfaces';
import { EvaluateFn, SerializableOrJSHandle } from 'puppeteer';
import { LevelLogger } from '../';
import { getDefaultLayoutSelectors } from '../../../common';
import { LAYOUT_TYPES } from '../../../common/constants';
import { LayoutSelectorDictionary, Size } from '../../../common/types';
import { HeadlessChromiumDriver } from '../../browsers';
import { CaptureConfig } from '../../types';
import type { LayoutInstance } from './';
import { Layout } from './layout';

export class PrintLayout extends Layout implements LayoutInstance {
  public readonly selectors: LayoutSelectorDictionary = {
    ...getDefaultLayoutSelectors(),
    screenshot: '[data-shared-item]',
  };
  public readonly groupCount = 2;
  private captureConfig: CaptureConfig;

  constructor(captureConfig: CaptureConfig) {
    super(LAYOUT_TYPES.PRINT);
    this.captureConfig = captureConfig;
  }

  public getCssOverridesPath() {
    return path.join(__dirname, 'print.css');
  }

  public getBrowserViewport() {
    return this.captureConfig.viewport;
  }

  public getBrowserZoom() {
    return this.captureConfig.zoom;
  }

  public getViewport(itemsCount: number) {
    return {
      zoom: this.captureConfig.zoom,
      width: this.captureConfig.viewport.width,
      height: this.captureConfig.viewport.height * itemsCount,
    };
  }

  public async positionElements(
    browser: HeadlessChromiumDriver,
    logger: LevelLogger
  ): Promise<void> {
    logger.debug('positioning elements');

    const elementSize: Size = {
      width: this.captureConfig.viewport.width / this.captureConfig.zoom,
      height: this.captureConfig.viewport.height / this.captureConfig.zoom,
    };
    const evalOptions: { fn: EvaluateFn; args: SerializableOrJSHandle[] } = {
      fn: (selector: string, height: number, width: number) => {
        const visualizations = document.querySelectorAll(selector) as NodeListOf<HTMLElement>;
        const visualizationsLength = visualizations.length;

        for (let i = 0; i < visualizationsLength; i++) {
          const visualization = visualizations[i];
          const style = visualization.style;
          style.position = 'fixed';
          style.top = `${height * i}px`;
          style.left = '0';
          style.width = `${width}px`;
          style.height = `${height}px`;
          style.zIndex = '1';
          style.backgroundColor = 'inherit';
        }
      },
      args: [this.selectors.screenshot, elementSize.height, elementSize.width],
    };

    await browser.evaluate(evalOptions, { context: 'PositionElements' }, logger);
  }

  public getPdfImageSize() {
    return {
      width: 500,
    };
  }

  public getPdfPageOrientation(): PageOrientation {
    return 'portrait';
  }

  public getPdfPageSize(): PredefinedPageSize {
    return 'A4';
  }
}
