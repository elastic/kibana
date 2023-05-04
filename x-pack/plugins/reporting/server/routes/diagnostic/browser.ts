/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocLinksServiceSetup, Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { lastValueFrom } from 'rxjs';
import type { DiagnosticResponse } from '.';
import type { ReportingCore } from '../..';
import { API_DIAGNOSE_URL } from '../../../common/constants';
import { authorizedUserPreRouting, getCounters } from '../lib';

const logsToHelpMapFactory = (docLinks: DocLinksServiceSetup) => ({
  'error while loading shared libraries': i18n.translate(
    'xpack.reporting.diagnostic.browserMissingDependency',
    {
      defaultMessage: `The browser couldn't start properly due to missing system dependencies. Please see {url}`,
      values: { url: docLinks.links.reporting.browserSystemDependencies },
    }
  ),

  'Could not find the default font': i18n.translate(
    'xpack.reporting.diagnostic.browserMissingFonts',
    {
      defaultMessage: `The browser couldn't locate a default font. Please see {url} to fix this issue.`,
      values: { url: docLinks.links.reporting.browserSystemDependencies },
    }
  ),

  'No usable sandbox': i18n.translate('xpack.reporting.diagnostic.noUsableSandbox', {
    defaultMessage: `Unable to use Chromium sandbox. This can be disabled at your own risk with 'xpack.screenshotting.browser.chromium.disableSandbox'. Please see {url}`,
    values: { url: docLinks.links.reporting.browserSandboxDependencies },
  }),
});

const path = `${API_DIAGNOSE_URL}/browser`;

export const registerDiagnoseBrowser = (reporting: ReportingCore, logger: Logger) => {
  const { router } = reporting.getPluginSetupDeps();

  router.post(
    { path: `${path}`, validate: {} },
    authorizedUserPreRouting(reporting, async (_user, _context, req, res) => {
      const counters = getCounters(req.route.method, path, reporting.getUsageCounter());

      const { docLinks } = reporting.getPluginSetupDeps();

      const logsToHelpMap = logsToHelpMapFactory(docLinks);
      try {
        const { screenshotting } = await reporting.getPluginStartDeps();
        const logs = await lastValueFrom(screenshotting.diagnose());
        const knownIssues = Object.keys(logsToHelpMap) as Array<keyof typeof logsToHelpMap>;

        const boundSuccessfully = logs.includes(`DevTools listening on`);
        const help = knownIssues.reduce((helpTexts: string[], knownIssue) => {
          const helpText = logsToHelpMap[knownIssue];
          if (logs.includes(knownIssue)) {
            helpTexts.push(helpText);
          }
          return helpTexts;
        }, []);

        const success = boundSuccessfully && !help.length;
        const response: DiagnosticResponse = {
          success,
          help,
          logs,
        };

        counters.usageCounter(success ? 'success' : 'failure');

        return res.ok({ body: response });
      } catch (err) {
        logger.error(err);
        counters.errorCounter(undefined, 500);
        return res.custom({ statusCode: 500 });
      }
    })
  );
};
