/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PartialRule } from '@kbn/alerting-plugin/server';
import { isEqual, xorWith } from 'lodash';
import { stringifyZodError } from '@kbn/zod-helpers';
import {
  type ResponseAction,
  type RuleCreateProps,
  RuleResponse,
  type RuleResponseAction,
  type RuleUpdateProps,
  type RulePatchProps,
} from '../../../../../common/api/detection_engine';
import {
  RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP,
  RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ,
} from '../../../../../common/endpoint/service/response_actions/constants';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../..';
import { CustomHttpRequestError } from '../../../../utils/custom_http_request_error';
import { hasValidRuleType, type RuleAlertType, type RuleParams } from '../../rule_schema';
import { type BulkError, createBulkErrorObject } from '../../routes/utils';
import { internalRuleToAPIResponse } from '../logic/detection_rules_client/converters/internal_rule_to_api_response';
import { ClientError } from '../logic/detection_rules_client/utils';

export const transformValidateBulkError = (
  ruleId: string,
  rule: PartialRule<RuleParams>
): RuleResponse | BulkError => {
  if (hasValidRuleType(rule)) {
    const transformed = internalRuleToAPIResponse(rule);
    const result = RuleResponse.safeParse(transformed);
    if (!result.success) {
      return createBulkErrorObject({
        ruleId,
        statusCode: 500,
        message: stringifyZodError(result.error),
      });
    }
    return result.data;
  } else {
    return createBulkErrorObject({
      ruleId,
      statusCode: 500,
      message: 'Internal error transforming',
    });
  }
};

// Temporary functionality until the new System Actions is in place
// for now we want to make sure that user cannot configure Isolate action if has no RBAC permissions to do so
export const validateResponseActionsPermissions = async (
  securitySolution: SecuritySolutionApiRequestHandlerContext,
  ruleUpdate: RuleCreateProps | RuleUpdateProps,
  existingRule?: RuleAlertType | null
): Promise<void> => {
  if (
    !rulePayloadContainsResponseActions(ruleUpdate) ||
    (existingRule && !ruleObjectContainsResponseActions(existingRule))
  ) {
    return;
  }

  if (
    ruleUpdate.response_actions?.length === 0 &&
    existingRule?.params?.responseActions?.length === 0
  ) {
    return;
  }

  const endpointAuthz = await securitySolution.getEndpointAuthz();

  // finds elements that are not included in both arrays
  const symmetricDifference = xorWith<ResponseAction | RuleResponseAction>(
    ruleUpdate.response_actions,
    existingRule?.params?.responseActions,
    isEqual
  );

  symmetricDifference.forEach((action) => {
    if (!('command' in action?.params)) {
      return;
    }
    const authzPropName =
      RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ[
        RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP[action.params.command]
      ];

    const isValid = endpointAuthz[authzPropName];

    if (!isValid) {
      throw new CustomHttpRequestError(
        `User is not authorized to change ${action.params.command} response actions`,
        403
      );
    }
  });
};

function rulePayloadContainsResponseActions(rule: RuleCreateProps | RuleUpdateProps) {
  return 'response_actions' in rule;
}

function ruleObjectContainsResponseActions(rule?: RuleAlertType) {
  return rule != null && 'params' in rule && 'responseActions' in rule?.params;
}

export const validateNonCustomizableUpdateFields = (
  ruleUpdate: RuleUpdateProps,
  existingRule: RuleResponse
) => {
  // We don't allow non-customizable fields to be changed for prebuilt rules
  if (existingRule.rule_source && existingRule.rule_source.type === 'external') {
    if (!isEqual(ruleUpdate.author, existingRule.author)) {
      throw new ClientError(`Cannot update "author" field for prebuilt rules`, 400);
    } else if (ruleUpdate.license !== existingRule.license) {
      throw new ClientError(`Cannot update "license" field for prebuilt rules`, 400);
    }
  }
};

export const validateNonCustomizablePatchFields = (
  rulePatch: RulePatchProps,
  existingRule: RuleResponse
) => {
  // We don't allow non-customizable fields to be changed for prebuilt rules
  if (existingRule.rule_source && existingRule.rule_source.type === 'external') {
    if (rulePatch.author && !isEqual(rulePatch.author, existingRule.author)) {
      throw new ClientError(`Cannot update "author" field for prebuilt rules`, 400);
    } else if (rulePatch.license != null && rulePatch.license !== existingRule.license) {
      throw new ClientError(`Cannot update "license" field for prebuilt rules`, 400);
    }
  }
};
