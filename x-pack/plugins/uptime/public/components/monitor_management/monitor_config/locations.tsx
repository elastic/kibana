/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { monitorManagementListSelector } from '../../../state/selectors';
import { ServiceLocation } from '../../../../common/runtime_types';

interface Props {
  selectedLocations: ServiceLocation[];
  setLocations: React.Dispatch<React.SetStateAction<ServiceLocation[]>>;
  isInvalid: boolean;
}

export const ServiceLocations = ({ selectedLocations, setLocations, isInvalid }: Props) => {
  const [error, setError] = useState<string | null>(null);
  const { locations } = useSelector(monitorManagementListSelector);

  const onLocationChange = (
    selectedLocationOptions: Array<EuiComboBoxOptionOption<ServiceLocation>>
  ) => {
    setLocations(selectedLocationOptions as ServiceLocation[]);
    setError(null);
  };

  const onSearchChange = (value: string, hasMatchingOptions?: boolean) => {
    setError(value.length === 0 || hasMatchingOptions ? null : getInvalidOptionError(value));
  };

  const onBlur = (event: unknown) => {
    const inputElement = (event as FocusEvent)?.target as HTMLInputElement;
    if (inputElement) {
      const { value } = inputElement;
      setError(value.length === 0 ? null : getInvalidOptionError(value));
    }
  };

  const errorMessage = error ?? (isInvalid ? VALIDATION_ERROR : null);

  return (
    <EuiFormRow label={LOCATIONS_LABEL} error={errorMessage} isInvalid={errorMessage !== null}>
      <EuiComboBox
        placeholder={PLACEHOLDER_LABEL}
        options={locations}
        selectedOptions={selectedLocations}
        onChange={onLocationChange}
        onSearchChange={onSearchChange}
        onBlur={onBlur}
        data-test-subj="syntheticsServiceLocationsComboBox"
      />
    </EuiFormRow>
  );
};

const PLACEHOLDER_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.serviceLocationsPlaceholderLabel',
  {
    defaultMessage: 'Select one or more locations to run your monitor.',
  }
);

const VALIDATION_ERROR = i18n.translate(
  'xpack.uptime.monitorManagement.serviceLocationsValidationError',
  {
    defaultMessage: 'At least one service location must be specified',
  }
);

const getInvalidOptionError = (value: string) =>
  i18n.translate('xpack.uptime.monitorManagement.serviceLocationsOptionError', {
    defaultMessage: '"{value}" is not a valid option',
    values: {
      value,
    },
  });

export const LOCATIONS_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.monitorLocationsLabel',
  {
    defaultMessage: 'Monitor locations',
  }
);
