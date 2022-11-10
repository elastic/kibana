/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forEach, isEmpty } from 'lodash';
import type {
  FieldsMap,
  ValidationError,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { RESPONSE_ACTION_TYPES } from '../../../common/detection_engine/rule_response_actions/schemas';

export const validateForEmptyParams = (
  responseActions: Array<{ actionTypeId: string; params: string }>,
  fields: FieldsMap
) => {
  const paramsErrors: Array<ValidationError<string>> = [];

  forEach(responseActions, async (action, index) => {
    if (action.actionTypeId === RESPONSE_ACTION_TYPES.OSQUERY && isEmpty(action.params)) {
      paramsErrors.push(fields[`responseActions[${index}].params`].errors[0]);
    }
  });

  return paramsErrors?.map((error) => error?.message).join('\n');
};

export const getCustomErrorMessage = (name: string) => {
  switch (name) {
    case 'ecs_mapping':
      return 'ECS mapping is required';
    default:
      return 'Something is wrong with the form';
  }
};
