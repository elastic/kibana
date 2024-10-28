/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiRadioGroup } from '@elastic/eui';
import { AlertSuppressionMissingFieldsStrategyEnum } from '../../../../../../../../../common/api/detection_engine';
import { UseMultiFields } from '../../../../../../../../shared_imports';
import { SuppressionInfoIcon } from './suppression_info_icon';
import * as i18n from './translations';

interface MissingFieldsStrategySelectorProps {
  disabled?: boolean;
}

export function MissingFieldsStrategySelector({
  disabled,
}: MissingFieldsStrategySelectorProps): JSX.Element {
  return (
    <EuiFormRow
      data-test-subj="alertSuppressionMissingFields"
      label={
        <span>
          {i18n.ALERT_SUPPRESSION_MISSING_FIELDS_FORM_ROW_LABEL} <SuppressionInfoIcon />
        </span>
      }
      fullWidth
    >
      <UseMultiFields<{
        suppressionMissingFields: string | undefined;
      }>
        fields={{
          suppressionMissingFields: {
            path: 'suppressionMissingFields',
          },
        }}
      >
        {({ suppressionMissingFields }) => (
          <EuiRadioGroup
            disabled={disabled}
            idSelected={suppressionMissingFields.value}
            options={[
              {
                id: AlertSuppressionMissingFieldsStrategyEnum.suppress,
                label: i18n.ALERT_SUPPRESSION_MISSING_FIELDS_SUPPRESS_OPTION,
              },
              {
                id: AlertSuppressionMissingFieldsStrategyEnum.doNotSuppress,
                label: i18n.ALERT_SUPPRESSION_MISSING_FIELDS_DO_NOT_SUPPRESS_OPTION,
              },
            ]}
            onChange={(id) => {
              suppressionMissingFields.setValue(id);
            }}
            data-test-subj="suppressionMissingFieldsOptions"
          />
        )}
      </UseMultiFields>
    </EuiFormRow>
  );
}
