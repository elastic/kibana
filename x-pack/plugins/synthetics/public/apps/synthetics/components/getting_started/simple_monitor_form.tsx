/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldText,
  EuiFormRow,
  EuiForm,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useSimpleMonitor } from './use_simple_monitor';
import { ServiceLocationsField } from './form_fields/service_locations';
import { ConfigKey, ServiceLocations } from '../../../../../common/runtime_types';
import { useFormWrapped } from '../../../../hooks/use_form_wrapped';

export interface SimpleFormData {
  urls: string;
  locations: ServiceLocations;
}

export const SimpleMonitorForm = () => {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitted },
  } = useFormWrapped({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: { urls: '', locations: [] as ServiceLocations },
  });

  const [monitorData, setMonitorData] = useState<SimpleFormData | undefined>();

  const onSubmit = (data: SimpleFormData) => {
    setMonitorData(data);
  };

  const { loading, data: newMonitor } = useSimpleMonitor({ monitorData });

  const hasURLError = !!errors?.[ConfigKey.URLS];

  return (
    <EuiForm
      onSubmit={handleSubmit(onSubmit)}
      component="form"
      isInvalid={isSubmitted && !isValid && !loading && !newMonitor?.id}
      noValidate
    >
      <EuiFormRow
        fullWidth
        label={WEBSITE_URL_LABEL}
        helpText={!hasURLError ? WEBSITE_URL_HELP_TEXT : ''}
        isInvalid={!!errors?.[ConfigKey.URLS]}
        error={hasURLError ? URL_REQUIRED_LABEL : undefined}
      >
        <EuiFieldText
          placeholder={WEBSITE_URL_PLACEHOLDER}
          fullWidth
          {...register(ConfigKey.URLS, { required: true })}
          isInvalid={!!errors?.[ConfigKey.URLS]}
          data-test-subj={`${ConfigKey.URLS}-input`}
          tabIndex={0}
        />
      </EuiFormRow>
      <EuiSpacer />
      <ServiceLocationsField errors={errors} control={control} />
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            type="submit"
            fill
            iconType="plusInCircleFilled"
            isLoading={loading}
            data-test-subj="syntheticsMonitorConfigSubmitButton"
          >
            {CREATE_MONITOR_LABEL}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};

export const WEBSITE_URL_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.websiteUrlLabel',
  {
    defaultMessage: 'Website URL',
  }
);

export const WEBSITE_URL_PLACEHOLDER = i18n.translate(
  'xpack.synthetics.monitorManagement.websiteUrlPlaceholder',
  {
    defaultMessage: 'Enter a website URL',
  }
);

export const WEBSITE_URL_HELP_TEXT = i18n.translate(
  'xpack.synthetics.monitorManagement.websiteUrlHelpText',
  {
    defaultMessage: `For example, your company's homepage or https://elastic.co`,
  }
);

export const CREATE_MONITOR_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.createMonitorLabel',
  { defaultMessage: 'Create monitor' }
);

export const MONITOR_SUCCESS_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.monitorAddedSuccessMessage',
  {
    defaultMessage: 'Monitor added successfully.',
  }
);

export const URL_REQUIRED_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.urlRequiredLabel',
  {
    defaultMessage: 'URL is required',
  }
);
