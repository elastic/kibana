/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { APP_WRAPPER_CLASS } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { LayoutParams } from '@kbn/screenshotting-plugin/common';
import assert from 'assert';
import { firstValueFrom, lastValueFrom, mergeMap, toArray } from 'rxjs';
import { DiagnosticResponse } from '.';
import { incrementApiUsageCounter } from '..';
import { ReportingCore } from '../..';
import { API_DIAGNOSE_URL } from '../../../common/constants';
import { generatePngObservable } from '../../export_types/common';
import { getAbsoluteUrlFactory } from '../../export_types/common/get_absolute_url';
import { authorizedUserPreRouting } from '../lib/authorized_user_pre_routing';

const path = `${API_DIAGNOSE_URL}/screenshot`;

export const registerDiagnoseScreenshot = (reporting: ReportingCore, logger: Logger) => {
  const setupDeps = reporting.getPluginSetupDeps();
  const { router } = setupDeps;

  router.post(
    { path, validate: {} },
    authorizedUserPreRouting(reporting, async (_user, _context, req, res) => {
      incrementApiUsageCounter(req.route.method, path, reporting.getUsageCounter());

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
      const layout: LayoutParams<'preserve_layout'> = {
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

      let response: DiagnosticResponse = {
        success: true,
        help: [],
        logs: [],
      };
      try {
        const result = await lastValueFrom(
          generatePngObservable(reporting, logger, {
            layout,
            request: req,
            browserTimezone: 'UTC',
            urls: [hashUrl],
          }).pipe(
            mergeMap(async ({ logs$, ...rest }) => ({
              logs: await firstValueFrom(logs$.pipe(toArray())),
              ...rest,
            }))
          )
        );

        assert(result, 'PNG result is undefined');
        assert(result.buffer, 'PNG result buffer is undefined');

        const logs = result.logs ?? [];
        if (result.warnings.length) {
          response.success = false;
          response.logs = result.warnings.concat(logs);
        } else {
          response.logs = logs;
        }

        response.capture = result.buffer.toString('base64');
      } catch (err) {
        response = {
          success: false,
          help: [
            i18n.translate('xpack.reporting.diagnostic.screenshotFailureMessage', {
              defaultMessage: `We couldn't screenshot your Kibana install.`,
            }),
          ],
          logs: [err.message],
        };
      }

      return res.ok({ body: response });
    })
  );
};
