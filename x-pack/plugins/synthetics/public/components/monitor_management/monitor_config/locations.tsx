/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { EuiCheckboxGroup, EuiFormRow } from '@elastic/eui';
import { monitorManagementListSelector } from '../../../state/selectors';
import { ServiceLocation } from '../../../../common/runtime_types';

interface Props {
  selectedLocations: ServiceLocation[];
  setLocations: React.Dispatch<React.SetStateAction<ServiceLocation[]>>;
  isInvalid: boolean;
  onBlur?: () => void;
}

export const ServiceLocations = ({ selectedLocations, setLocations, isInvalid, onBlur }: Props) => {
  const [error, setError] = useState<string | null>(null);
  const [checkboxIdToSelectedMap, setCheckboxIdToSelectedMap] = useState<Record<string, boolean>>(
    {}
  );
  const { locations } = useSelector(monitorManagementListSelector);

  const onLocationChange = (optionId: string) => {
    const isSelected = !checkboxIdToSelectedMap[optionId];
    const location = locations.find((loc) => loc.id === optionId);
    if (isSelected) {
      setLocations((prevLocations) => (location ? [...prevLocations, location] : prevLocations));
    } else {
      setLocations((prevLocations) => [...prevLocations].filter((loc) => loc.id !== optionId));
    }
    setError(null);
  };

  const errorMessage = error ?? (isInvalid ? VALIDATION_ERROR : null);

  useEffect(() => {
    const newCheckboxIdToSelectedMap = selectedLocations.reduce<Record<string, boolean>>(
      (acc, location) => {
        acc[location.id] = true;
        return acc;
      },
      {}
    );
    setCheckboxIdToSelectedMap(newCheckboxIdToSelectedMap);
  }, [selectedLocations]);

  return (
    <EuiFormRow label={LOCATIONS_LABEL} error={errorMessage} isInvalid={errorMessage !== null}>
      <EuiCheckboxGroup
        options={locations.map((location) => ({
          ...location,
          'data-test-subj': `syntheticsServiceLocation--${location.id}`,
        }))}
        idToSelectedMap={checkboxIdToSelectedMap}
        onChange={(id) => onLocationChange(id)}
        onBlur={() => onBlur?.()}
      />
    </EuiFormRow>
  );
};

const VALIDATION_ERROR = i18n.translate(
  'xpack.uptime.monitorManagement.serviceLocationsValidationError',
  {
    defaultMessage: 'At least one service location must be specified',
  }
);

export const LOCATIONS_LABEL = i18n.translate(
  'xpack.uptime.monitorManagement.monitorLocationsLabel',
  {
    defaultMessage: 'Monitor locations',
  }
);
