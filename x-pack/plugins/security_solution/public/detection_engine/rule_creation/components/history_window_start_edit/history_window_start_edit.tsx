/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ScheduleItemField } from '../schedule_item_field';
import type { ValidationFunc } from '../../../../shared_imports';
import { type FieldConfig, UseField } from '../../../../shared_imports';
import { type HistoryWindowStart } from '../../../../../common/api/detection_engine';
import * as i18n from './translations';

const COMPONENT_PROPS = {
  idAria: 'historyWindowSize',
  dataTestSubj: 'historyWindowSize',
  timeTypes: ['m', 'h', 'd'],
};

interface HistoryWindowStartEditProps {
  path: string;
}

export function HistoryWindowStartEdit({ path }: HistoryWindowStartEditProps): JSX.Element {
  return (
    <UseField
      path={path}
      config={HISTORY_WINDOW_START_FIELD_CONFIG}
      component={ScheduleItemField}
      componentProps={COMPONENT_PROPS}
    />
  );
}

const HISTORY_WINDOW_START_FIELD_CONFIG: FieldConfig<HistoryWindowStart> = {
  label: i18n.HISTORY_WINDOW_START_LABEL,
  helpText: i18n.HELP_TEXT,
  validations: [
    {
      validator: (...args: Parameters<ValidationFunc>) => {
        const [{ path, value }] = args;

        const historyWindowSize = Number.parseInt(String(value), 10);

        if (Number.isNaN(historyWindowSize)) {
          return {
            code: 'ERR_NOT_INT_NUMBER',
            path,
            message: i18n.MUST_BE_POSITIVE_INTEGER_VALIDATION_ERROR,
          };
        }

        if (historyWindowSize <= 0) {
          return {
            code: 'ERR_MIN_LENGTH',
            path,
            message: i18n.MUST_BE_GREATER_THAN_ZERO_VALIDATION_ERROR,
          };
        }
      },
    },
  ],
};
