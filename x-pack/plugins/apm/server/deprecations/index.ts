/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetDeprecationsContext, DeprecationsDetails } from 'src/core/server';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { CloudSetup } from '../../../cloud/server';
import { getCloudAgentPolicy } from '../lib/fleet/get_cloud_apm_package_policy';
import { APMRouteHandlerResources } from '../';

export function getDeprecations({
  cloudSetup,
  fleet,
  branch,
}: {
  cloudSetup?: CloudSetup;
  fleet?: APMRouteHandlerResources['plugins']['fleet'];
  branch: string;
}) {
  return async ({
    savedObjectsClient,
  }: GetDeprecationsContext): Promise<DeprecationsDetails[]> => {
    const deprecations: DeprecationsDetails[] = [];
    if (!fleet) {
      return deprecations;
    }

    const fleetPluginStart = await fleet.start();
    const cloudAgentPolicy = await getCloudAgentPolicy({
      fleetPluginStart,
      savedObjectsClient,
    });

    const isCloudEnabled = !!cloudSetup?.isCloudEnabled;

    const hasCloudAgentPolicy = !isEmpty(cloudAgentPolicy);

    if (isCloudEnabled && !hasCloudAgentPolicy) {
      deprecations.push({
        title: i18n.translate('xpack.apm.deprecations.legacyModeTitle', {
          defaultMessage: 'APM Server running in legacy mode',
        }),
        message: i18n.translate('xpack.apm.deprecations.message', {
          defaultMessage:
            'Running the APM Server binary directly is considered a legacy option and is deprecated since 7.16. Switch to APM Server managed by an Elastic Agent instead. Read our documentation to learn more.',
        }),
        documentationUrl: `https://www.elastic.co/guide/en/apm/server/${branch}/apm-integration.html`,
        level: 'warning',
        correctiveActions: {
          manualSteps: [
            i18n.translate('xpack.apm.deprecations.steps.apm', {
              defaultMessage: 'Navigate to Observability/APM',
            }),
            i18n.translate('xpack.apm.deprecations.steps.settings', {
              defaultMessage: 'Click on "Settings"',
            }),
            i18n.translate('xpack.apm.deprecations.steps.schema', {
              defaultMessage: 'Select "Schema" tab',
            }),
            i18n.translate('xpack.apm.deprecations.steps.switch', {
              defaultMessage:
                'Click "Switch to data streams". You will be guided through the process',
            }),
          ],
        },
      });
    }

    return deprecations;
  };
}
