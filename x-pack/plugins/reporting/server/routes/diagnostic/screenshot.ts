/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/core/server';
import { getDefaultChromiumSandboxDisabled } from '@kbn/screenshotting-plugin/server/config/default_chromium_sandbox_disabled';
import { getChromiumPackage, paths } from '@kbn/screenshotting-plugin/server/utils';
import { getDataPath } from '@kbn/utils';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { ReplaySubject, toArray } from 'rxjs';
import { ReportingCore } from '../..';
import { API_DIAGNOSE_URL } from '../../../common/constants';
import { authorizedUserPreRouting } from '../lib/authorized_user_pre_routing';

const chromiumPath = path.resolve('x-pack/plugins/screenshotting/chromium');
const DEFAULT_QUERY_VIEWPORT = '1200,3000,2';

export const registerDiagnoseScreenshot = (reporting: ReportingCore, loggerContext: Logger) => {
  const logger = loggerContext.get('diagnose-screenshot');
  const setupDeps = reporting.getPluginSetupDeps();
  const { router } = setupDeps;

  router.post<void, { viewport: string } | undefined, void>(
    {
      path: `${API_DIAGNOSE_URL}/screenshot`,
      validate: {
        query: schema.maybe(
          schema.object({
            // width,height,deviceScaleFactor
            // must validate as: `number,number,number`
            viewport: schema.string({ validate: (input) => input }),
          })
        ),
      },
    },
    authorizedUserPreRouting(
      reporting,
      async (
        _user,
        context,
        req,
        res
        // prettier-ignore
      ) => {
        if (context.reporting == null) {
          return res.custom({ statusCode: 503 });
        }

        // width,height,deviceScaleFactor
        const queryViewport = req.query?.viewport ?? DEFAULT_QUERY_VIEWPORT;

        let browser: puppeteer.Browser | null = null;
        let page: puppeteer.Page | null = null;
        const error$ = new ReplaySubject<Error>();
        const log$ = new ReplaySubject<string>();

        try {
          // SETUP
          const packageInfo = getChromiumPackage();
          const executablePath = paths.getBinaryPath(packageInfo, chromiumPath);
          const dataDir = getDataPath();
          fs.mkdirSync(dataDir, { recursive: true });
          const userDataDir = fs.mkdtempSync(path.join(dataDir, 'chromium-'));
          const { os, disableSandbox } = await getDefaultChromiumSandboxDisabled();

          logger.info(`sandbox disabled: ${disableSandbox}`);
          logger.info(`os / distro: ${JSON.stringify(os)}`);
          logger.info(`chromium path: ${chromiumPath}`);
          logger.info(`browser info: ${JSON.stringify(packageInfo)}`);
          logger.info(`binary path: ${executablePath}`);
          logger.info(`viewport (width,height,deviceScaleFactor): ${queryViewport}`);
          logger.info(`user data: ${userDataDir}`);

          const args = [
            `--disable-background-networking`,
            `--disable-default-apps`,
            `--disable-extensions`,
            `--disable-gpu`,
            `--disable-sync`,
            `--disable-translate`,
            `--headless`,
            `--hide-scrollbars`,
            `--mainFrameClipsContent=false`,
            `--metrics-recording-only`,
            `--mute-audio`,
            `--no-first-run`,
            `--safebrowsing-disable-auto-update`,
            `--user-data-dir=${userDataDir}`,
            `--window-size=1950,1200`,
          ];
          if (disableSandbox) {
            args.push('--no-sandbox');
          }

          // LAUNCH
          logger.info(`Launching the browser...`);
          browser = await puppeteer.launch({ executablePath, userDataDir, args });
          page = await browser.newPage();

          // ADD LISTENERS
          page.on('console', (msg) => {
            const [text, type] = [msg.text(), msg.type()];
            logger.info(`console-${type}: ${text}`);
            log$.next(`console-${type}: ${text}`);
          });

          page.on('error', (err) => {
            logger.error(err);
            error$.next(err);
          });

          logger.info(`Navigating to test page...`);
          await page.goto('https://webglsamples.org/aquarium/aquarium.html', {
            waitUntil: 'load',
          });
        } catch (err) {
          error$.next(err);
          logger.error(err);
        }

        const [width, height, deviceScaleFactor] = queryViewport
          .split(',')
          .map((part) => parseInt(part, 10));
        const viewport: puppeteer.Viewport = { width, height, deviceScaleFactor };

        let capture: string | null = null;
        if (page != null && browser != null) {
          // FIXME: needs to poll the DOM or scan the console logs to determine when page is ready to capture
          await new Promise((resolve) => setTimeout(resolve, 1000));

          try {
            // set device scale factor: affects the blurriness / clarity of the numbers
            logger.info(`Resizing the window...`);
            await page.setViewport(viewport);

            // capture the page
            logger.info(`Capturing screenshot...`);
            const screenshot = await page.screenshot({
              clip: { x: 0, y: 0, width: viewport.width, height: viewport.height },
              captureBeyondViewport: false,
            });

            logger.info(`Closing the browser...`);
            await browser.close();

            logger.info(`Preparing the screenshot for response...`);
            if (Buffer.isBuffer(screenshot)) {
              capture = screenshot.toString('base64');
            } else {
              capture = screenshot;
            }
          } catch (err) {
            logger.error(err);
            error$.next(err);
          }
        }

        let errors: string[] | undefined;
        let logs: string[] | undefined;
        error$.pipe(toArray()).subscribe((errs) => {
          errors = errs.map((e) => e.toString() + '\n');
        });
        log$.pipe(toArray()).subscribe((ls) => {
          logs = ls.map((l) => l + '\n');
        });
        error$.complete();
        log$.complete();

        return res.ok({
          body: {
            success: capture != null,
            help: errors,
            logs,
            capture,
          },
        });
      }
    )
  );
};
