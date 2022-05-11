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
import React, { useEffect, useState } from 'react';
import { useFetcher } from '@kbn/observability-plugin/public';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ServiceLocationsField } from './form_fields/service_locations';
import { kibanaService } from '../../../../utils/kibana_service';
import { DEFAULT_FIELDS } from '../../../../../common/constants/monitor_defaults';
import { createMonitorAPI } from '../../state/monitor_management/api';
import {
  ConfigKey,
  DataStream,
  ServiceLocations,
  SyntheticsMonitorWithId,
} from '../../../../../common/runtime_types';
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
    mode: 'onBlur',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: { urls: '', locations: [] as ServiceLocations },
  });

  const { application } = useKibana().services;

  const [monitorData, setMonitorData] = useState<SimpleFormData>({
    urls: '',
    locations: [],
  });

  const onSubmit = (data: SimpleFormData) => {
    setMonitorData(data);
  };

  const { data, loading } = useFetcher(() => {
    if (!monitorData.urls || monitorData.locations.length < 1) {
      return new Promise<undefined>((resolve) => resolve(undefined));
    }
    const { urls, locations } = monitorData;

    return createMonitorAPI({
      monitor: {
        ...monitorData,
        ...DEFAULT_FIELDS.browser,
        'source.inline.script': `step('Go to ${urls}', async () => {
                                    await page.goto('${urls}');
                                });`,
        [ConfigKey.MONITOR_TYPE]: DataStream.BROWSER,
        [ConfigKey.NAME]: MY_FIRST_MONITOR,
        [ConfigKey.LOCATIONS]: locations,
      },
    });
  }, [monitorData]);

  useEffect(() => {
    const newMonitor = data as SyntheticsMonitorWithId;
    if (!loading && newMonitor?.id) {
      kibanaService.toasts.addSuccess({
        title: MONITOR_SUCCESS_LABEL,
        toastLifeTimeMs: 3000,
      });
      application?.navigateToApp('uptime', { path: `/monitor/${btoa(newMonitor.id)}` });
    }
  }, [application, data, loading]);

  const hasURLError = !!errors?.[ConfigKey.URLS];

  return (
    <EuiForm onSubmit={handleSubmit(onSubmit)} component="form" isInvalid={isSubmitted && !isValid}>
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
          autoFocus={true}
          tabIndex={0}
        />
      </EuiFormRow>
      <EuiSpacer />
      <ServiceLocationsField errors={errors} control={control} />
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton type="submit" fill iconType="plusInCircleFilled" isLoading={loading}>
            {CREATE_MONITOR_LABEL}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};

export const MY_FIRST_MONITOR = i18n.translate(
  'xpack.synthetics.monitorManagement.myFirstMonitor',
  {
    defaultMessage: 'My first monitor',
  }
);

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
