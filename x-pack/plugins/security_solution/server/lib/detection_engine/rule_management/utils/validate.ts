/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';

import type { PartialRule } from '@kbn/alerting-plugin/server';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../..';
import { CustomHttpRequestError } from '../../../../utils/custom_http_request_error';
import type { ResponseAction } from '../../../../../common/detection_engine/rule_response_actions/schemas';
import type {
  RuleCreateProps,
  RuleUpdateProps,
} from '../../../../../common/detection_engine/rule_schema';
import { RuleResponse } from '../../../../../common/detection_engine/rule_schema';
import type { RuleParams, RuleAlertType } from '../../rule_schema';
import { isAlertType } from '../../rule_schema';
import type { BulkError } from '../../routes/utils';
import { createBulkErrorObject } from '../../routes/utils';
import { transform } from './utils';
import { internalRuleToAPIResponse } from '../normalization/rule_converters';

export const transformValidate = (
  rule: PartialRule<RuleParams>
): [RuleResponse | null, string | null] => {
  const transformed = transform(rule);
  if (transformed == null) {
    return [null, 'Internal error transforming'];
  } else {
    return validateNonExact(transformed, RuleResponse);
  }
};

export const transformValidateBulkError = (
  ruleId: string,
  rule: PartialRule<RuleParams>
): RuleResponse | BulkError => {
  if (isAlertType(rule)) {
    const transformed = internalRuleToAPIResponse(rule);
    const [validated, errors] = validateNonExact(transformed, RuleResponse);
    if (errors != null || validated == null) {
      return createBulkErrorObject({
        ruleId,
        statusCode: 500,
        message: errors ?? 'Internal error transforming',
      });
    } else {
      return validated;
    }
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
  body: RuleCreateProps | RuleUpdateProps,
  existingRule?: RuleAlertType | null | undefined
) => {
  // This functionality has to check just for Isolate command so far. When we decide to enable more commands, we will need to use more complex validation here.
  if (body.response_actions?.length || existingRule?.params?.responseActions?.length) {
    const endpointAuthz = await securitySolution.getEndpointAuthz();

    if (endpointAuthz.canIsolateHost) {
      return;
    }

    const ruleBodyContainsIsolate = body.response_actions?.find((action: ResponseAction) => {
      return action.action_type_id === '.endpoint' && action.params.command === 'isolate';
    });

    console.log({ test: existingRule?.params?.responseActions });
    const existingRuleContainIsolate = existingRule?.params?.responseActions?.find(
      (action: ResponseAction) => {
        return action.actionTypeId === '.endpoint' && action.params.command === 'isolate';
      }
    );

    console.log({ existingRuleContainIsolate, ruleBodyContainsIsolate });

    if (
      (existingRuleContainIsolate && !ruleBodyContainsIsolate) ||
      (!existingRuleContainIsolate && ruleBodyContainsIsolate)
    ) {
      throw new CustomHttpRequestError(
        'User is not authorized to change isolate host response actions',
        400
      );
    }
  }
};
