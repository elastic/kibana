/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ERROR_CODE, ValidationFunc } from '../../../../../../../../shared_imports';
import { type FormData, type FormSchema } from '../../../../../../../../shared_imports';
import { RuleFieldEditFormWrapper } from '../rule_field_edit_form_wrapper';
import { HistoryWindowStartEditAdapter } from './history_window_start_edit_adapter';
import type { HistoryWindowStart } from '../../../../../../../../../common/api/detection_engine';
import { schema } from '../../../../../../../rule_creation_ui/components/step_define_rule/schema';
import {
  convertHistorySizeToStart,
  convertHistoryStartToSize,
} from '../../../../../../../../common/utils/history_window';
import { DEFAULT_HISTORY_WINDOW_SIZE } from '../../../../../../../../common/constants';
import { historyWindowStartValidationFactory } from '../../../../../../../rule_creation_ui/validators/history_window_start_validator_factory';

export function HistoryWindowStartEditForm(): JSX.Element {
  return (
    <RuleFieldEditFormWrapper
      component={HistoryWindowStartEditAdapter}
      ruleFieldFormSchema={historyWindowFormSchema}
      deserializer={deserializer}
      serializer={serializer}
    />
  );
}

interface HistoryWindowFormData {
  historyWindowSize: HistoryWindowStart;
}

function deserializer(defaultValue: FormData): HistoryWindowFormData {
  return {
    historyWindowSize: defaultValue.history_window_start
      ? convertHistoryStartToSize(defaultValue.history_window_start)
      : DEFAULT_HISTORY_WINDOW_SIZE,
  };
}

function serializer(formData: FormData): { history_window_start: HistoryWindowStart } {
  return {
    history_window_start: convertHistorySizeToStart(formData.historyWindowSize),
  };
}

export const historyWindowFormSchema = {
  historyWindowSize: {
    /*
      For some reason, TS complains that schema.historyWindowSize can be a string, which is incorrect. Nevertheless, adding a runtime check to ensure it's an object and make TS happy.
    */
    ...(typeof schema.historyWindowSize === 'object' ? schema.historyWindowSize : {}),
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined =>
          historyWindowStartValidationFactory(...args),
      },
    ],
  },
} as FormSchema<{
  historyWindowSize: HistoryWindowStart;
}>;
