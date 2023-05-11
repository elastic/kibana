/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';

import type { PartialRule } from '@kbn/alerting-plugin/server';
import type { Rule } from '@kbn/alerting-plugin/common';
import { getUiCommand, getRbacControl } from '../../../../../common/endpoint/utils/commands';
import type { SecuritySolutionApiRequestHandlerContext } from '../../../..';
import { CustomHttpRequestError } from '../../../../utils/custom_http_request_error';
import type {
  QueryRule,
  RuleCreateProps,
  RuleUpdateProps,
} from '../../../../../common/detection_engine/rule_schema';
import { RuleResponse } from '../../../../../common/detection_engine/rule_schema';
import type { RuleParams, RuleAlertType, UnifiedQueryRuleParams } from '../../rule_schema';
import { isAlertType } from '../../rule_schema';
import type { BulkError } from '../../routes/utils';
import { createBulkErrorObject } from '../../routes/utils';
import { findDifferenceInArrays, transform } from './utils';
import { internalRuleToAPIResponse } from '../normalization/rule_converters';
import type {
  ResponseAction,
  RuleResponseAction,
} from '../../../../../common/detection_engine/rule_response_actions/schemas';

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
  ruleUpdate: RuleCreateProps | RuleUpdateProps,
  existingRule?: RuleAlertType | null
) => {
  const payload = ruleUpdate as QueryRule;
  const existingPayload = existingRule as Rule<UnifiedQueryRuleParams>;

  if (payload.response_actions?.length || existingPayload?.params?.responseActions?.length) {
    const endpointAuthz = await securitySolution.getEndpointAuthz();

    const difference = findDifferenceInArrays<ResponseAction, RuleResponseAction>(
      payload.response_actions,
      existingPayload?.params?.responseActions
    );

    difference.forEach((action) => {
      if ('command' in action?.params) {
        const isInvalid = !getRbacControl({
          commandName: getUiCommand(action.params.command),
          privileges: { ...endpointAuthz, loading: false },
        });

        if (isInvalid) {
          throw new CustomHttpRequestError(
            `User is not authorized to change ${action.params.command} response actions`,
            400
          );
        }
      }
    });
  }
};
