/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ScheduleItemField } from '../schedule_item_field';
import type { ERROR_CODE, ValidationFunc } from '../../../../shared_imports';
import { type FieldConfig, UseField } from '../../../../shared_imports';
import { type HistoryWindowStart } from '../../../../../common/api/detection_engine';
import { historyWindowStartValidationFactory } from '../../../rule_creation_ui/validators/history_window_start_validator_factory';

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
  label: i18n.translate(
    'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.historyWindowSizeLabel',
    {
      defaultMessage: 'History Window Size',
    }
  ),
  helpText: i18n.translate(
    'xpack.securitySolution.detectionEngine.createRule.stepScheduleRule.historyWindowSizeHelpText',
    {
      defaultMessage: "New terms rules only alert if terms don't appear in historical data.",
    }
  ),
  validations: [
    {
      validator: (
        ...args: Parameters<ValidationFunc>
      ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined =>
        historyWindowStartValidationFactory(...args),
    },
  ],
};
