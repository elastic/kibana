/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiAccordion, EuiDescribedFormGroup, EuiPanel, EuiSpacer } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { FORM_CONFIG } from '../form/form_config';
import { Field } from '../form/field';
import { ConfigKey, FormMonitorType } from '../types';

export const AdvancedConfig = () => {
  const {
    watch,
    formState: { errors },
  } = useFormContext();
  const [type]: [FormMonitorType] = watch([ConfigKey.FORM_MONITOR_TYPE]);

  return FORM_CONFIG[type]?.advanced ? (
    <EuiPanel hasBorder>
      <EuiAccordion
        id="syntheticsAdvancedPanel"
        buttonContent={i18n.translate('xpack.synthetics.monitorConfig.advancedOptions.title', {
          defaultMessage: 'Advanced options',
        })}
      >
        <EuiSpacer />
        {FORM_CONFIG[type].advanced?.map((configGroup) => {
          return (
            <EuiDescribedFormGroup
              description={configGroup.description}
              title={<h4>{configGroup.title}</h4>}
              fullWidth
              key={configGroup.title}
            >
              {configGroup.components.map((field) => {
                return (
                  <Field {...field} key={field.fieldKey} fieldError={errors[field.fieldKey]} />
                );
              })}
            </EuiDescribedFormGroup>
          );
        })}
      </EuiAccordion>
    </EuiPanel>
  ) : null;
};
