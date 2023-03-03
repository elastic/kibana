/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserActionFindResponse } from '@kbn/cases-plugin/common/api';
import { getCaseFindUserActionsUrl } from '@kbn/cases-plugin/common/api';
import { INTERNAL_BULK_CREATE_ATTACHMENTS_URL } from '@kbn/cases-plugin/common/constants';
import { resolvePathVariables } from '../../../common/utils/resolve_path_variables';
import { DEFAULT_ALERTS_INDEX, DETECTION_ENGINE_RULES_URL } from '../../../../common/constants';
import { createCyChainable, request } from './common';
import { ELASTIC_SECURITY_RULE_ID } from '../../../../../../test/detection_engine_api_integration/utils';
import type { Rule } from '../../../detection_engine/rule_management/logic';

export interface AddAlertsToCaseOptions {
  caseId: string;
  alertIds: string[];
}

export interface AddAlertsToCaseOptionsResponse {
  /** A map (object) of containing the case comment IDs for each Alert that was added */
  comments: Record<string, string>;
}

export const addAlertsToCase = ({
  caseId,
  alertIds,
}: AddAlertsToCaseOptions): Cypress.Chainable<AddAlertsToCaseOptionsResponse> => {
  return createCyChainable((): Promise<AddAlertsToCaseOptionsResponse> => {
    return new Promise<AddAlertsToCaseOptionsResponse>((resolve) => {
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
            url: resolvePathVariables(INTERNAL_BULK_CREATE_ATTACHMENTS_URL, { case_id: caseId }),
            body: alertIds.map((alertId) => {
              return {
                alertId,
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
          }).then(() => {
            request<UserActionFindResponse>({
              method: 'GET',
              url: getCaseFindUserActionsUrl(caseId),
              qs: {
                sortOrder: 'asc',
                perPage: 10000,
              },
            }).then((caseActions) => {
              const comments: AddAlertsToCaseOptionsResponse['comments'] = {};

              for (const userAction of caseActions.body.userActions) {
                if (
                  userAction.type === 'comment' &&
                  userAction.action === 'create' &&
                  userAction.payload.comment.type === 'alert' &&
                  alertIds.includes(userAction.payload.comment.alertId as string)
                ) {
                  comments[userAction.payload.comment.alertId as string] = userAction.id;
                }
              }

              resolve({ comments });
            });
          });
        });
    });
  });
};
