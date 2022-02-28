/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run, createFailError } from '@kbn/dev-utils';
import { KbnClient } from '@kbn/test';
import { indexFleetEndpointPolicy } from '../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { setupFleetForEndpoint } from '../../../common/endpoint/data_loaders/setup_fleet_for_endpoint';
import { BaseDataGenerator } from '../../../common/endpoint/data_generators/base_data_generator';

class EndpointPolicyGenerator extends BaseDataGenerator {
  public policyName(preFix: string | number = '') {
    return `${preFix}${preFix ? ' ' : ''}${this.randomString(5)} Endpoint Policy`;
  }
}

const generate = new EndpointPolicyGenerator();

export const cli = () => {
  run(
    async ({ log, flags: { kibana, count } }) => {
      const kbn = new KbnClient({ log, url: kibana as string });
      const max = Number(count);
      let created = 0;

      log.info(`Creating ${count} endpoint policies...`);

      try {
        const { endpointPackage } = await setupFleetForEndpoint(kbn);

        while (created < max) {
          created++;
          await indexFleetEndpointPolicy(
            kbn,
            generate.policyName(created),
            endpointPackage.version
          );
        }
      } catch (error) {
        log.error(error);
        throw createFailError(error.message);
      }

      log.success(`Done!`);
    },
    {
      description: 'Load Endpoint Policies into fleet (also creates associated Agent Policies)',
      flags: {
        string: ['kibana'],
        default: {
          count: 15,
          kibana: 'http://elastic:changeme@localhost:5601',
        },
        help: `
        --count            Number of Endpoint Policies to create. Default: 15
        --kibana           The URL to kibana including credentials. Default: http://elastic:changeme@localhost:5601
      `,
      },
    }
  );
};
