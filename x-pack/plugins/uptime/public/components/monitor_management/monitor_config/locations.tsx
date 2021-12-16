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
import { ServiceLocation } from '../../../../common/runtime_types/monitor_management';

interface Props {
  selectedLocations: ServiceLocation[];
  setLocations: React.Dispatch<React.SetStateAction<ServiceLocation[]>>;
}

export const ServiceLocations = ({ selectedLocations, setLocations }: Props) => {
  const [locationsInputRef, setLocationsInputRef] = useState<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { locations } = useSelector(monitorManagementListSelector);

  const onLocationChange = (
    selectedLocationOptions: Array<EuiComboBoxOptionOption<ServiceLocation>>
  ) => {
    setLocations(selectedLocationOptions as ServiceLocation[]);
    setError(null);
  };

  const onSearchChange = (value: string, hasMatchingOptions?: boolean) => {
    setError(value.length === 0 || hasMatchingOptions ? null : `"${value}" is not a valid option`);
  };

  const onBlur = () => {
    if (locationsInputRef) {
      const { value } = locationsInputRef;
      setError(value.length === 0 ? null : `"${value}" is not a valid option`);
    }
  };

  return (
    <EuiFormRow label={LOCATIONS_LABEL} error={error} isInvalid={error !== null}>
      <EuiComboBox
        placeholder={PLACEHOLDER_LABEL}
        options={locations}
        selectedOptions={selectedLocations}
        inputRef={setLocationsInputRef}
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
    defaultMessage: 'Select one or locations to run your monitor.',
  }
);

export const LOCATIONS_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.monitorLocationsLabel',
  {
    defaultMessage: 'Monitor locations',
  }
);
