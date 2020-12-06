/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ReportingCore } from '../..';
import { API_DIAGNOSE_URL } from '../../../common/constants';
import { browserStartLogs } from '../../browsers/chromium/driver_factory/start_logs';
import { LevelLogger as Logger } from '../../lib';
import { authorizedUserPreRoutingFactory } from '../lib/authorized_user_pre_routing';
import { DiagnosticResponse } from './';

const logsToHelpMap = {
  'error while loading shared libraries': i18n.translate(
    'xpack.reporting.diagnostic.browserMissingDependency',
    {
      defaultMessage: `The browser couldn't start properly due to missing system dependencies. Please see {url}`,
      values: {
        url:
          'https://www.elastic.co/guide/en/kibana/current/reporting-troubleshooting.html#reporting-troubleshooting-system-dependencies',
      },
    }
  ),

  'Could not find the default font': i18n.translate(
    'xpack.reporting.diagnostic.browserMissingFonts',
    {
      defaultMessage: `The browser couldn't locate a default font. Please see {url} to fix this issue.`,
      values: {
        url:
          'https://www.elastic.co/guide/en/kibana/current/reporting-troubleshooting.html#reporting-troubleshooting-system-dependencies',
      },
    }
  ),

  'No usable sandbox': i18n.translate('xpack.reporting.diagnostic.noUsableSandbox', {
    defaultMessage: `Unable to use Chromium sandbox. This can be disabled at your own risk with 'xpack.reporting.capture.browser.chromium.disableSandbox'. Please see {url}`,
    values: {
      url:
        'https://www.elastic.co/guide/en/kibana/current/reporting-troubleshooting.html#reporting-troubleshooting-sandbox-dependency',
    },
  }),
};

export const registerDiagnoseBrowser = (reporting: ReportingCore, logger: Logger) => {
  const { router } = reporting.getPluginSetupDeps();
  const userHandler = authorizedUserPreRoutingFactory(reporting);

  router.post(
    {
      path: `${API_DIAGNOSE_URL}/browser`,
      validate: {},
    },
    userHandler(async (user, context, req, res) => {
      try {
        const logs = await browserStartLogs(reporting, logger).toPromise();
        const knownIssues = Object.keys(logsToHelpMap) as Array<keyof typeof logsToHelpMap>;

        const boundSuccessfully = logs.includes(`DevTools listening on`);
        const help = knownIssues.reduce((helpTexts: string[], knownIssue) => {
          const helpText = logsToHelpMap[knownIssue];
          if (logs.includes(knownIssue)) {
            helpTexts.push(helpText);
          }
          return helpTexts;
        }, []);

        const response: DiagnosticResponse = {
          success: boundSuccessfully && !help.length,
          help,
          logs,
        };

        return res.ok({ body: response });
      } catch (err) {
        logger.error(err);
        return res.custom({ statusCode: 500 });
      }
    })
  );
};
