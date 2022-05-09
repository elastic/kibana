/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldText, EuiFormRow, EuiForm, EuiButton, EuiComboBox } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { Controller } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useFetcher } from '@kbn/observability-plugin/public';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DEFAULT_FIELDS } from '../../../../../common/constants/monitor_defaults';
import { createMonitorAPI } from '../../state/monitor_management/api';
import { serviceLocationsSelector } from '../../state/monitor_management/service_locations';
import { ConfigKey, DataStream, ServiceLocations } from '../../../../../common/runtime_types';
import { useFormWrapped } from '../../../../hooks/use_form_wrapped';

interface FormData {
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
    defaultValues: { urls: '', locations: [] },
  });

  const { application } = useKibana().services;

  const [monitorData, setMonitorData] = useState<FormData>({
    urls: '',
    locations: [],
  });

  const onSubmit = (data: FormData) => {
    setMonitorData(data);
  };

  const { data, loading } = useFetcher(() => {
    if (!isSubmitted || !isValid) {
      return new Promise((resolve) => resolve(null));
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
  }, [monitorData, isValid, isSubmitted]);

  useEffect(() => {
    if (!loading && data?.id) {
      application?.navigateToApp('uptime', { path: `/monitor/${btoa(data.id)}` });
    }
  }, [application, data, loading]);

  const locations = useSelector(serviceLocationsSelector);

  return (
    <EuiForm onSubmit={handleSubmit(onSubmit)} component="form" isInvalid={isSubmitted && !isValid}>
      <EuiFormRow
        fullWidth
        label="Website URL"
        helpText="For example, your company's homepage or https://elastic.co"
        isInvalid={!!errors?.[ConfigKey.URLS]}
      >
        <EuiFieldText
          fullWidth
          {...register(ConfigKey.URLS, { required: true })}
          isInvalid={!!errors?.[ConfigKey.URLS]}
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label="Locations"
        helpText="Select on or more locations."
        isInvalid={!!errors?.[ConfigKey.LOCATIONS]}
      >
        <Controller
          name={ConfigKey.LOCATIONS}
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <EuiComboBox
              fullWidth
              aria-label="Accessible screen reader label"
              placeholder="Select or create options"
              options={locations.map((location) => ({
                ...location,
                'data-test-subj': `syntheticsServiceLocation--${location.id}`,
              }))}
              selectedOptions={field.value}
              isClearable={true}
              data-test-subj="demoComboBox"
              autoFocus
              {...field}
              isInvalid={!!errors?.[ConfigKey.LOCATIONS]}
            />
          )}
        />
      </EuiFormRow>
      <EuiButton type="submit" fill iconType="plus" isLoading={loading}>
        Create monitor
      </EuiButton>
    </EuiForm>
  );
};

const MY_FIRST_MONITOR = i18n.translate('xpack.synthetics.monitorManagement.myFirstMonitor', {
  defaultMessage: 'My first monitor',
});
