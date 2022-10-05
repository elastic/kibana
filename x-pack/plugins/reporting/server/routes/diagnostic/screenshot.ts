/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import os from 'os';
import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/core/server';
import {
  getMetrics,
  Metrics,
} from '@kbn/screenshotting-plugin/server/browsers/chromium/driver_factory/metrics';
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
const DEFAULT_QUERY_VIEWPORT = '2400,2000,2';
const queryValidation = {
  query: schema.maybe(
    schema.object({
      viewport: schema.maybe(
        schema.string({
          validate: (_input) => {
            return;
          },
        })
      ),
    })
  ),
};
const getTime = () => new Date(Date.now()).valueOf();
const getTiming = ({ start, end }: { start?: number; end?: number }) => {
  if (end && start) {
    return end - start;
  }
  return null;
};

interface DiagnoseTimingMetric {
  start?: number;
  end?: number;
}
interface DiagnoseTimings {
  launch: DiagnoseTimingMetric;
  open: DiagnoseTimingMetric;
  render: DiagnoseTimingMetric;
  capture: DiagnoseTimingMetric;
  metrics: DiagnoseTimingMetric;
  cleanup: DiagnoseTimingMetric;
}

export const registerDiagnoseScreenshot = (reporting: ReportingCore, loggerContext: Logger) => {
  const logger = loggerContext.get('diagnose-screenshot');
  const headlessLogger = logger.get('headless-console');
  const setupDeps = reporting.getPluginSetupDeps();
  const { router } = setupDeps;

  router.post<void, { viewport?: string } | undefined, void>(
    {
      path: `${API_DIAGNOSE_URL}/screenshot`,
      validate: queryValidation,
    },
    authorizedUserPreRouting(reporting, async (_user, context, req, res) => {
      if (context.reporting == null) {
        return res.custom({ statusCode: 503 });
      }

      // width,height,deviceScaleFactor
      const queryViewport = req.query?.viewport ?? DEFAULT_QUERY_VIEWPORT;

      let browser: puppeteer.Browser | null = null;
      let page: puppeteer.Page | null = null;
      let devTools: puppeteer.CDPSession | null = null;
      let startMetrics: Metrics | null = null;
      const error$ = new ReplaySubject<Error>();
      const log$ = new ReplaySubject<string>();

      const timings: DiagnoseTimings = {
        launch: {},
        open: {},
        render: {},
        capture: {},
        metrics: {},
        cleanup: {},
      };

      const realLog = (message: string, realLogger = logger) => {
        log$.next(message);
        realLogger.info(message);
      };

      try {
        // 1. Setup
        const packageInfo = getChromiumPackage();
        const executablePath = paths.getBinaryPath(packageInfo, chromiumPath);
        const dataDir = getDataPath();
        fs.mkdirSync(dataDir, { recursive: true });
        const userDataDir = fs.mkdtempSync(path.join(dataDir, 'chromium-'));
        const { os: sandboxOs, disableSandbox } = await getDefaultChromiumSandboxDisabled();

        realLog(`sandbox disabled: ${disableSandbox}`);
        realLog(`os / distro: ${JSON.stringify(sandboxOs)}`);
        realLog(`architecture: ${os.arch()}`);
        realLog(`chromium path: ${chromiumPath}`);
        realLog(`binary path: ${executablePath}`);
        realLog(`viewport (width,height,deviceScaleFactor): ${queryViewport}`);
        realLog(`user data: ${userDataDir}`);

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

        // 2. Launch
        timings.launch.start = getTime();
        browser = await puppeteer.launch({ executablePath, userDataDir, args });
        page = await browser.newPage();

        // 3. ADD LISTENERS
        page.on('console', (msg) => {
          const [text, type] = [msg.text(), msg.type()];
          realLog(`console-${type}: ${text}`, headlessLogger);
        });
        page.on('error', (err) => {
          headlessLogger.error(err);
          error$.next(err);
        });

        // 4. START METRICS, GET VERSION
        devTools = await page.target().createCDPSession();
        await devTools.send('Performance.enable', { timeDomain: 'timeTicks' });
        startMetrics = await devTools.send('Performance.getMetrics');

        const versionInfo = await devTools.send('Browser.getVersion');
        realLog(`browser version: ${JSON.stringify(versionInfo)}`);
        timings.launch.end = getTime();

        // 5. GO TO PAGE
        timings.open.start = getTime();
        await page.goto('https://webglsamples.org/aquarium/aquarium.html', {
          waitUntil: 'load',
        });
        await page.evaluate(() => {
          // eslint-disable-next-line no-console
          console.log(
            `Navigating URL with viewport size: width=${window.innerWidth} height=${window.innerHeight} scaleFactor:${window.devicePixelRatio}`
          );
          window.addEventListener('resize', () => {
            // eslint-disable-next-line no-console
            console.log(
              `Detected a viewport resize: width=${window.innerWidth} height=${window.innerHeight} scaleFactor:${window.devicePixelRatio}`
            );
          });
        });
        timings.open.end = getTime();
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
        // 5. INITIAL SIZE
        timings.render.start = getTime();
        await page.setViewport(viewport);

        // 6. WAIT FOR RENDER
        await new Promise((resolve) => setTimeout(resolve, 1000));

        try {
          // 7. RESIZE BEFORE CAPTURE
          // rendering may have changed the dimensions we need to capture.
          // set device scale factor: affects the blurriness / clarity of the numbers
          await page.setViewport(viewport);
          timings.render.end = getTime();

          // 8. CAPTURE
          timings.capture.start = getTime();
          realLog(`Capturing screenshot...`);
          const screenshot = await page.screenshot({
            clip: { x: 0, y: 0, width: viewport.width, height: viewport.height },
            captureBeyondViewport: false,
          });
          timings.capture.end = getTime();

          // 9. REPORT METRICS
          if (devTools != null && startMetrics != null) {
            timings.metrics.start = getTime();
            const endMetrics = await devTools.send('Performance.getMetrics');
            const metrics = getMetrics(startMetrics, endMetrics);
            const { cpuInPercentage, memoryInMegabytes } = metrics;
            realLog(`Chromium consumed CPU ${cpuInPercentage}% Memory ${memoryInMegabytes}MB`);
            timings.metrics.end = getTime();
          }

          // 10. CLEANUP
          timings.cleanup.start = getTime();
          realLog(`Closing the browser...`);
          await browser.close();

          if (Buffer.isBuffer(screenshot)) {
            realLog(`Preparing the screenshot for response...`);
            capture = screenshot.toString('base64');
          } else {
            capture = screenshot;
          }
          timings.cleanup.end = getTime();
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

      realLog(`Done`);
      error$.complete();
      log$.complete();

      return res.ok({
        body: {
          timings: {
            launch: getTiming(timings.launch),
            open: getTiming(timings.open),
            render: getTiming(timings.render),
            capture: getTiming(timings.capture),
            metrics: getTiming(timings.metrics),
            cleanup: getTiming(timings.cleanup),
          },
          success: capture != null,
          help: errors,
          logs,
          capture,
        },
      });
    })
  );
};
