/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

//import * as Rx from 'rxjs';
//import { first, tap, mergeMap } from 'rxjs/operators';
import fs from 'fs';
import getPort from 'get-port';
import { promisify } from 'bluebird';
import { LevelLogger } from '../../../server/lib/level_logger';

const fsp = {
  readFile: promisify(fs.readFile, fs)
};

export function screenshotsObservableFactory(server) {
  const config = server.config();
  const logger = LevelLogger.createForServer(server, ['reporting', 'screenshots']);

  const browserDriverFactory = server.plugins.reporting.browserDriverFactory;
  const captureConfig = config.get('xpack.reporting.capture');

  const asyncDurationLogger = async (description, promise) => {
    const start = new Date();
    const result = await promise;
    logger.debug(`${description} took ${new Date() - start}ms`);
    return result;
  };

  const openUrl = async (browser, url, headers) => {
    const waitForSelector = '.application';

    await browser.open(url, {
      headers,
      waitForSelector,
    });
  };

  const injectCustomCss = async (browser, layout) => {
    const filePath = layout.getCssOverridesPath();
    const buffer = await fsp.readFile(filePath);
    await browser.evaluate({
      fn: function (css) {
        const node = document.createElement('style');
        node.type = "text/css";
        node.innerHTML = css; // eslint-disable-line no-unsanitized/property
        document.getElementsByTagName('head')[0].appendChild(node);
      },
      args: [buffer.toString()],
    });
  };

  const waitForElementOrItemsCountAttribute = async (browser, layout) => {
    // the dashboard is using the `itemsCountAttribute` attribute to let us
    // know how many items to expect since gridster incrementally adds panels
    // we have to use this hint to wait for all of them
    await browser.waitForSelector(`${layout.selectors.renderComplete},[${layout.selectors.itemsCountAttribute}]`);
  };

  const waitForNotFoundError = async (browser) => {
    await browser.waitForSelector(`.toast.alert.alert-danger`);
    throw new Error('Reporting subject could not be loaded to take a screenshot.');
  };

  const getNumberOfItems = async (browser, layout) => {
    // returns the value of the `itemsCountAttribute` if it's there, otherwise
    // we just count the number of `itemSelector`
    const itemsCount = await browser.evaluate({
      fn: function (selector, countAttribute) {
        const elementWithCount = document.querySelector(`[${countAttribute}]`);
        if (elementWithCount) {
          return parseInt(elementWithCount.getAttribute(countAttribute));
        }

        return document.querySelectorAll(selector).length;
      },
      args: [layout.selectors.renderComplete, layout.selectors.itemsCountAttribute],
    });
    return itemsCount;
  };

  const waitForElementsToBeInDOM = async (browser, itemsCount, layout) => {
    await browser.waitFor({
      fn: function (selector) {
        return document.querySelectorAll(selector).length;
      },
      args: [layout.selectors.renderComplete],
      toEqual: itemsCount
    });
  };

  const setViewport = async (browser, itemsCount, layout) => {
    const viewport = layout.getViewport(itemsCount);
    await browser.setViewport(viewport);
  };

  const positionElements = async (browser, layout) => {
    if (layout.positionElements) {
      await layout.positionElements(browser);
    }
  };

  const waitForRenderComplete = async (browser, layout) => {
    await browser.evaluate({
      fn: function (selector, visLoadDelay) {
        // wait for visualizations to finish loading
        const visualizations = document.querySelectorAll(selector);
        const visCount = visualizations.length;
        const renderedTasks = [];

        function waitForRender(visualization) {
          return new Promise(function (resolve) {
            visualization.addEventListener('renderComplete', () => resolve());
          });
        }

        function waitForRenderDelay() {
          return new Promise(function (resolve) {
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
        const hackyWaitForVisualizations = () => new Promise(r => setTimeout(r, 100));

        return Promise.all(renderedTasks).then(hackyWaitForVisualizations);
      },
      args: [layout.selectors.renderComplete, captureConfig.loadDelay],
      awaitPromise: true,
    });
  };

  const getTimeRange = async (browser, layout) => {
    const timeRange = await browser.evaluate({
      fn: function (fromAttribute, toAttribute) {
        const fromElement = document.querySelector(`[${fromAttribute}]`);
        const toElement = document.querySelector(`[${toAttribute}]`);

        if (!fromElement || !toElement) {
          return null;
        }

        const from = fromElement.getAttribute(fromAttribute);
        const to = toElement.getAttribute(toAttribute);
        if (!to || !from) {
          return null;
        }

        return { from, to };
      },
      args: [layout.selectors.timefilterFromAttribute, layout.selectors.timefilterToAttribute],
      returnByValue: true,
    });
    return timeRange;
  };

  const getElementPositionAndAttributes = async (browser, layout) => {
    const elementsPositionAndAttributes = await browser.evaluate({
      fn: function (selector, attributes) {
        const elements = document.querySelectorAll(selector);

        // NodeList isn't an array, just an iterator, unable to use .map/.forEach
        const results = [];
        for (const element of elements) {
          const boundingClientRect = element.getBoundingClientRect();
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
                y: window.scrollY
              }
            },
            attributes: Object.keys(attributes).reduce((result, key) => {
              const attribute = attributes[key];
              result[key] = element.getAttribute(attribute);
              return result;
            }, {})
          });
        }
        return results;

      },
      args: [layout.selectors.screenshot, { title: 'data-title', description: 'data-description' }],
      returnByValue: true,
    });

    return elementsPositionAndAttributes;
  };

  const getScreenshots = async ({ browser, elementsPositionAndAttributes }) => {
    const screenshots = [];
    for (const item of elementsPositionAndAttributes) {
      const base64EncodedData = await asyncDurationLogger('screenshot', browser.screenshot(item.position));

      screenshots.push({
        base64EncodedData,
        title: item.attributes.title,
        description: item.attributes.description
      });
    }
    return screenshots;
  };

  return async function screenshotsObservable(url, headers, layout, browserTimezone, cancellationToken) {

    const bridgePort = await getPort();

    logger.debug(`Creating browser driver factory`);

    const { browser, chromium } = await browserDriverFactory.create({
      bridgePort,
      viewport: layout.getBrowserViewport(),
      zoom: layout.getBrowserZoom(),
      logger,
      browserTimezone
    });

    if (cancellationToken) {
      cancellationToken.on(() => {
        logger.debug(`Closing Chromium due to cancellation`);
        chromium.close();
      });
    }

    logger.debug('Driver factory created');

    logger.debug(`opening ${url}`);
    await openUrl(browser, url, headers);

    logger.debug('injecting custom css');
    await injectCustomCss(browser, layout);

    logger.debug('waiting for elements or items count attribute; or not found to interrupt');
    Promise.race([waitForElementOrItemsCountAttribute(browser, layout), waitForNotFoundError(browser)])
      .then(function () {
      });

    logger.debug('determining how many items we have');
    const itemsCount = await getNumberOfItems(browser, layout);

    logger.debug('setting viewport');
    await setViewport(browser, itemsCount, layout);

    logger.debug(`waiting for ${itemsCount} to be in the DOM`);
    await waitForElementsToBeInDOM(browser, itemsCount, layout);

    logger.debug('positioning elements');
    await positionElements(browser, layout);

    logger.debug('waiting for rendering to complete');
    await  waitForRenderComplete(browser, layout);

    logger.debug('rendering is complete');
    const timeRange = await getTimeRange(browser, layout);

    logger.debug(timeRange ? `timeRange from ${timeRange.from} to ${timeRange.to}` : 'no timeRange');
    const elementsPositionAndAttributes = await getElementPositionAndAttributes(browser, layout);

    logger.debug(`taking screenshots`);
    const screenshots = await getScreenshots({ browser, elementsPositionAndAttributes });

    await chromium.close();

    return screenshots;
  };
}
