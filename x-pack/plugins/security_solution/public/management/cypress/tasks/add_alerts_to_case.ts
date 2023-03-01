/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_ALERTS_INDEX, DETECTION_ENGINE_RULES_URL } from '../../../../common/constants';
import { request } from './common';
import { ELASTIC_SECURITY_RULE_ID } from '../../../../../../test/detection_engine_api_integration/utils';
import type { Rule } from '../../../detection_engine/rule_management/logic';

export interface AddAlertsToCaseOptions {
  caseId: string;
  alertIds: string[];
}

export const addAlertsToCase = async ({ caseId, alertIds }: AddAlertsToCaseOptions) => {
  let endpointRuleDocId: string;

  request<Rule>({
    method: 'GET',
    url: DETECTION_ENGINE_RULES_URL,
    qs: { rule_id: ELASTIC_SECURITY_RULE_ID },
  })
    .then((rule) => {
      endpointRuleDocId = rule.body.id;
    })
    .then(() => {
      request({
        method: 'POST',
        url: `/internal/cases/${caseId}/attachments/_bulk_create`,
        body: alertIds.map((alertId) => {
          return {
            alertId,

            // FIXME:PT cleanup == index: '.internal.alerts-security.alerts-default-000001',
            // TODO: get index for each alert id instead of assuming they are in this hardcoded index
            index: `${DEFAULT_ALERTS_INDEX}-default`,
            type: 'alert',
            rule: {
              id: endpointRuleDocId,
              name: 'Endpoint Security',
            },
            owner: 'securitySolution',
          };
        }),
      });
    });
};
