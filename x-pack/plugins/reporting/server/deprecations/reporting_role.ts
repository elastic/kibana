/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetDeprecationsContext, DeprecationsDetails } from 'src/core/server';
import { i18n } from '@kbn/i18n';
import { ReportingCore } from '..';

const deprecatedRole = 'reporting_user';
const upgradableConfig = 'xpack.reporting.roles.enabled: false';

interface ExtraDependencies {
  reportingCore: ReportingCore;
}

export const getDeprecationsInfo = async (
  { esClient }: GetDeprecationsContext,
  { reportingCore }: ExtraDependencies
): Promise<DeprecationsDetails[]> => {
  const usingDeprecatedConfig = !reportingCore.getContract().usesUiCapabilities();
  const deprecations: DeprecationsDetails[] = [];
  const { body: users } = await esClient.asCurrentUser.security.getUser();

  const reportingUsers = Object.entries(users)
    .filter(([, user]) => user.roles.includes(deprecatedRole))
    .map(([, user]) => user.username);

  const numReportingUsers = reportingUsers.length;

  if (numReportingUsers > 0) {
    deprecations.push({
      title: i18n.translate('xpack.reporting.deprecations.reportingRoleTitle', {
        defaultMessage: 'Found deprecated reporting role',
      }),
      message: i18n.translate('xpack.reporting.deprecations.reportingRoleMessage', {
        defaultMessage:
          'The deprecated "{deprecatedRole}" role has been found for {numReportingUsers} user(s): "{usernames}"',
        values: { deprecatedRole, numReportingUsers, usernames: reportingUsers.join('", "') },
      }),
      documentationUrl: 'https://www.elastic.co/guide/en/kibana/current/secure-reporting.html',
      level: 'critical',
      correctiveActions: {
        manualSteps: [
          ...(usingDeprecatedConfig
            ? [
                i18n.translate('xpack.reporting.deprecations.reportingRole.manualStepOneMessage', {
                  defaultMessage: 'Set "{upgradableConfig}" in kibana.yml',
                  values: { upgradableConfig },
                }),
              ]
            : []),
          i18n.translate('xpack.reporting.deprecations.reportingRole.manualStepTwoMessage', {
            defaultMessage: `Create one or more custom roles that provide Kibana application privileges to reporting features in **Management > Security > Roles**.`,
          }),
          i18n.translate('xpack.reporting.deprecations.reportingRole.manualStepThreeMessage', {
            defaultMessage:
              'Assign the custom role(s) as desired, and remove the "{deprecatedRole}" role from the user(s).',
            values: { deprecatedRole },
          }),
        ],
      },
    });
  }

  return deprecations;
};
