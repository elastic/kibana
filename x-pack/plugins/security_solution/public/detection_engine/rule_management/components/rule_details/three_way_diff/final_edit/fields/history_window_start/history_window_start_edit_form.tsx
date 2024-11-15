/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
  historyWindowSize: schema.historyWindowSize,
} as FormSchema<{
  historyWindowSize: HistoryWindowStart;
}>;
