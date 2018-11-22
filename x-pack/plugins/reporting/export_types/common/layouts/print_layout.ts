/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import path from 'path';
import { EvaluateOptions, KbnServer, Size } from '../../../types';
import { LayoutTypes } from '../constants';
import { Layout } from './layout';
import { CaptureConfig } from './types';

interface BrowserClient {
  evaluate: (evaluateOptions: EvaluateOptions) => void;
}

export class PrintLayout extends Layout {
  public readonly selectors = {
    screenshot: '[data-shared-item]',
    renderComplete: '[data-shared-item]',
    itemsCountAttribute: 'data-shared-items-count',
    timefilterFromAttribute: 'data-shared-timefilter-from',
    timefilterToAttribute: 'data-shared-timefilter-to',
    toastHeader: '[data-test-subj="euiToastHeader"]',
  };

  public readonly groupCount = 2;

  private captureConfig: CaptureConfig;

  constructor(server: KbnServer) {
    super(LayoutTypes.PRINT);
    this.captureConfig = server.config().get('xpack.reporting.capture');
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

  public async positionElements(browser: BrowserClient): Promise<void> {
    const elementSize: Size = {
      width: this.captureConfig.viewport.width / this.captureConfig.zoom,
      height: this.captureConfig.viewport.height / this.captureConfig.zoom,
    };
    const evalOptions: EvaluateOptions = {
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

    await browser.evaluate(evalOptions);
  }

  public getPdfImageSize() {
    return {
      width: 500,
    };
  }

  public getPdfPageOrientation() {
    return 'portrait';
  }

  public getPdfPageSize() {
    return 'A4';
  }
}
