/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../src/core/server';
import { DETECTION_ENGINE_PREPACKAGED_URL } from '../../../../../common/constants';
import { transformError, buildSiemResponse } from '../utils';
import { getPrepackagedRules } from '../../rules/get_prepackaged_rules';
import { getRulesToInstall } from '../../rules/get_rules_to_install';
import { getRulesToUpdate } from '../../rules/get_rules_to_update';
import { findRules } from '../../rules/find_rules';
import { getExistingPrepackagedRules } from '../../rules/get_existing_prepackaged_rules';
import {
  PrePackagedRulesStatusSchema,
  prePackagedRulesStatusSchema,
} from '../schemas/response/prepackaged_rules_status_schema';
import { validate } from './validate';

export const getPrepackagedRulesStatusRoute = (router: IRouter) => {
  router.get(
    {
      path: `${DETECTION_ENGINE_PREPACKAGED_URL}/_status`,
      validate: false,
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const alertsClient = context.alerting?.getAlertsClient();

      if (!alertsClient) {
        return siemResponse.error({ statusCode: 404 });
      }

      try {
        const rulesFromFileSystem = getPrepackagedRules();
        const customRules = await findRules({
          alertsClient,
          perPage: 1,
          page: 1,
          sortField: 'enabled',
          sortOrder: 'desc',
          filter: 'alert.attributes.tags:"__internal_immutable:false"',
        });
        const prepackagedRules = await getExistingPrepackagedRules({ alertsClient });
        const rulesToInstall = getRulesToInstall(rulesFromFileSystem, prepackagedRules);
        const rulesToUpdate = getRulesToUpdate(rulesFromFileSystem, prepackagedRules);
        const prepackagedRulesStatus: PrePackagedRulesStatusSchema = {
          rules_custom_installed: customRules.total,
          rules_installed: prepackagedRules.length,
          rules_not_installed: rulesToInstall.length,
          rules_not_updated: rulesToUpdate.length,
        };
        const [validated, errors] = validate(prepackagedRulesStatus, prePackagedRulesStatusSchema);
        if (errors != null) {
          return siemResponse.error({ statusCode: 500, body: errors });
        } else {
          return response.ok({ body: validated ?? {} });
        }
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
