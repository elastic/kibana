/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CheckBoxField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { UseField, useFormData } from '../../../../../../../../shared_imports';
import { SuppressionDurationSelector } from './suppression_duration_selector';
import { THRESHOLD_SUPPRESSION_ENABLED } from './form_schema';
import * as i18n from './translations';

interface ThresholdAlertSuppressionEditProps {
  suppressibleFields: string[] | undefined;
}

export function ThresholdAlertSuppressionEdit({
  suppressibleFields,
}: ThresholdAlertSuppressionEditProps): JSX.Element {
  const [{ [THRESHOLD_SUPPRESSION_ENABLED]: enabled }] = useFormData({
    watch: THRESHOLD_SUPPRESSION_ENABLED,
  });

  return (
    <>
      <UseField
        path={THRESHOLD_SUPPRESSION_ENABLED}
        component={CheckBoxField}
        euiFieldProps={{
          label: suppressibleFields?.length
            ? i18n.enableSuppressionForFields(suppressibleFields)
            : i18n.SUPPRESS_ALERTS,
        }}
      />
      <SuppressionDurationSelector disabled={!enabled} />
    </>
  );
}
