/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Controller, Control } from 'react-hook-form';
import { useSelector } from 'react-redux';

import { EuiComboBox, EuiComboBoxProps, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ServiceLocation } from '../../../../../../common/runtime_types';
import { formatLocation } from '../../../../../../common/utils/location_formatter';
import { selectServiceLocationsState } from '../../../state';

import { SimpleFormData } from '../simple_monitor_form';
import { ConfigKey } from '../../../../../../common/constants/monitor_management';

export const ServiceLocationsField = ({
  control,
  onChange,
}: {
  control: Control<SimpleFormData, any>;
  onChange: (locations: ServiceLocation[]) => void;
}) => {
  const { locations } = useSelector(selectServiceLocationsState);

  const fieldState = control.getFieldState(ConfigKey.LOCATIONS);
  const showError = fieldState.isTouched || control._formState.isSubmitted;

  return (
    <EuiFormRow
      fullWidth
      label={LOCATIONS_LABEL}
      helpText={showError && fieldState.invalid ? undefined : SELECT_ONE_OR_MORE_LOCATIONS_DETAILS}
      isInvalid={showError && fieldState.invalid}
      error={showError ? SELECT_ONE_OR_MORE_LOCATIONS : undefined}
    >
      <Controller
        name={ConfigKey.LOCATIONS}
        control={control}
        rules={{
          validate: {
            notEmpty: (value: ServiceLocation[]) => {
              return value?.length > 0 ? true : SELECT_ONE_OR_MORE_LOCATIONS;
            },
          },
        }}
        render={({ field }) => (
          <ComboBoxWithRef
            fullWidth
            aria-label={SELECT_ONE_OR_MORE_LOCATIONS}
            options={locations.map((location) => ({
              ...location,
              'data-test-subj': `syntheticsServiceLocation--${location.id}`,
            }))}
            selectedOptions={field.value}
            isClearable={true}
            data-test-subj="syntheticsServiceLocations"
            {...field}
            onChange={async (selectedOptions) => {
              const updatedLocations = selectedOptions.map((loc) =>
                formatLocation(loc as ServiceLocation)
              );
              field.onChange(updatedLocations);
              onChange(updatedLocations as ServiceLocation[]);
            }}
          />
        )}
      />
    </EuiFormRow>
  );
};

const ComboBoxWithRef = React.forwardRef<HTMLInputElement, EuiComboBoxProps<ServiceLocation>>(
  (props, ref) => (
    <EuiComboBox
      {...props}
      inputRef={(element) => {
        if (ref) {
          if (typeof ref === 'function') {
            ref(element);
          } else {
            ref.current = element;
          }
        }
      }}
    />
  )
);

const SELECT_ONE_OR_MORE_LOCATIONS = i18n.translate(
  'xpack.synthetics.monitorManagement.selectOneOrMoreLocations',
  {
    defaultMessage: 'Select one or more locations.',
  }
);

const SELECT_ONE_OR_MORE_LOCATIONS_DETAILS = i18n.translate(
  'xpack.synthetics.monitorManagement.selectOneOrMoreLocationsDetails',
  {
    defaultMessage: 'Select locations where monitors will be executed.',
  }
);

const LOCATIONS_LABEL = i18n.translate('xpack.synthetics.monitorManagement.locationsLabel', {
  defaultMessage: 'Locations',
});
