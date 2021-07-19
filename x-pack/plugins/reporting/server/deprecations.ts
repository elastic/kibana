/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, DeprecationsDetails, RegisterDeprecationsConfig } from 'src/core/server';
import { ReportingCore } from '.';

const deprecatedRole = 'reporting_user';
const upgradableConfig = 'xpack.reporting.roles.enabled: false';

export async function registerDeprecations(
  reporting: ReportingCore,
  { deprecations: deprecationsService }: CoreSetup
) {
  const deprecationsConfig: RegisterDeprecationsConfig = {
    getDeprecations: async ({ esClient }) => {
      const usingDeprecatedConfig = !reporting.getContract().usesUiCapabilities();
      const deprecations: DeprecationsDetails[] = [];
      const { body: users } = await esClient.asCurrentUser.security.getUser();

      const reportingUsers = Object.entries(users)
        .filter(([username, user]) => user.roles.includes(deprecatedRole))
        .map(([, user]) => user.username);
      const numReportingUsers = reportingUsers.length;

      if (numReportingUsers > 0) {
        const usernames = reportingUsers.join('", "');
        deprecations.push({
          message: `The deprecated "${deprecatedRole}" role has been found for ${numReportingUsers} user(s): "${usernames}"`,
          documentationUrl: 'https://www.elastic.co/guide/en/kibana/current/secure-reporting.html',
          level: 'critical',
          correctiveActions: {
            manualSteps: [
              ...(usingDeprecatedConfig ? [`Set "${upgradableConfig}" in kibana.yml`] : []),
              `Create one or more custom roles that provide Kibana application privileges to reporting features in **Management > Security > Roles**.`,
              `Assign the custom role(s) as desired, and remove the "${deprecatedRole}" role from the user(s).`,
            ],
          },
        });
      }

      return deprecations;
    },
  };

  deprecationsService.registerDeprecations(deprecationsConfig);

  return deprecationsConfig;
}
