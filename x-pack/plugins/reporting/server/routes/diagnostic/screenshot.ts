/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Logger } from 'kibana/server';
import { lastValueFrom } from 'rxjs';
import { ReportingCore } from '../..';
import { APP_WRAPPER_CLASS } from '../../../../../../src/core/server';
import { API_DIAGNOSE_URL } from '../../../common/constants';
import { generatePngObservable } from '../../export_types/common';
import { getAbsoluteUrlFactory } from '../../export_types/common/get_absolute_url';
import { authorizedUserPreRouting } from '../lib/authorized_user_pre_routing';
import { DiagnosticResponse } from './';

export const registerDiagnoseScreenshot = (reporting: ReportingCore, logger: Logger) => {
  const setupDeps = reporting.getPluginSetupDeps();
  const { router } = setupDeps;

  router.post(
    {
      path: `${API_DIAGNOSE_URL}/screenshot`,
      validate: {},
    },
    authorizedUserPreRouting(reporting, async (_user, _context, request, res) => {
      const config = reporting.getConfig();
      const [basePath, protocol, hostname, port] = [
        config.kbnConfig.get('server', 'basePath'),
        config.get('kibanaServer', 'protocol'),
        config.get('kibanaServer', 'hostname'),
        config.get('kibanaServer', 'port'),
      ] as string[];

      const getAbsoluteUrl = getAbsoluteUrlFactory({ basePath, protocol, hostname, port });
      const hashUrl = getAbsoluteUrl({ path: '/', hash: '', search: '' });

      // Hack the layout to make the base/login page work
      const layout = {
        dimensions: {
          width: 1440,
          height: 2024,
        },
        selectors: {
          screenshot: `.${APP_WRAPPER_CLASS}`,
          renderComplete: `.${APP_WRAPPER_CLASS}`,
          itemsCountAttribute: 'data-test-subj="kibanaChrome"',
          timefilterDurationAttribute: 'data-test-subj="kibanaChrome"',
        },
      };

      return lastValueFrom(
        generatePngObservable(reporting, logger, {
          layout,
          request,
          browserTimezone: 'America/Los_Angeles',
          urls: [hashUrl],
        })
          // Pipe is required to ensure that we can subscribe to it
          .pipe()
      )
        .then((screenshot) => {
          // NOTE: the screenshot could be returned as a string using `data:image/png;base64,` + results.buffer.toString('base64')
          if (screenshot.warnings.length) {
            return res.ok({
              body: {
                success: false,
                help: [],
                logs: screenshot.warnings,
              },
            });
          }
          return res.ok({
            body: {
              success: true,
              help: [],
              logs: '',
            } as DiagnosticResponse,
          });
        })
        .catch((error) =>
          res.ok({
            body: {
              success: false,
              help: [
                i18n.translate('xpack.reporting.diagnostic.screenshotFailureMessage', {
                  defaultMessage: `We couldn't screenshot your Kibana install.`,
                }),
              ],
              logs: error.message,
            } as DiagnosticResponse,
          })
        );
    })
  );
};
