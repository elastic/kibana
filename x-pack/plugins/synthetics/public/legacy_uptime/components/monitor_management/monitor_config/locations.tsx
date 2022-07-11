/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { EuiCheckboxGroup, EuiFormRow, EuiText, EuiBadge } from '@elastic/eui';
import { monitorManagementListSelector } from '../../../state/selectors';
import { MonitorServiceLocations, LocationStatus } from '../../../../../common/runtime_types';

interface Props {
  selectedLocations: MonitorServiceLocations;
  setLocations: React.Dispatch<React.SetStateAction<MonitorServiceLocations>>;
  isInvalid: boolean;
  onBlur?: () => void;
  readOnly?: boolean;
}

export const ServiceLocations = ({
  selectedLocations,
  setLocations,
  isInvalid,
  onBlur,
  readOnly = false,
}: Props) => {
  const [error, setError] = useState<string | null>(null);
  const [checkboxIdToSelectedMap, setCheckboxIdToSelectedMap] = useState<Record<string, boolean>>(
    {}
  );
  const { locations } = useSelector(monitorManagementListSelector);

  const onLocationChange = (optionId: string) => {
    const isSelected = !checkboxIdToSelectedMap[optionId];
    const location = locations.find((loc) => loc.id === optionId);
    if (isSelected) {
      setLocations((prevLocations) =>
        location
          ? [...prevLocations, { id: location.id, isServiceManaged: location.isServiceManaged }]
          : prevLocations
      );
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
        options={locations.map((location) => {
          let badge =
            location.status !== LocationStatus.GA ? (
              <EuiBadge color="warning">Tech Preview</EuiBadge>
            ) : null;
          if (!location.isServiceManaged) {
            badge = <EuiBadge color="primary">Private</EuiBadge>;
          }
          const invalidBadge = location.isInvalid ? (
            <EuiBadge color="danger">Invalid</EuiBadge>
          ) : null;
          const label = (
            <EuiText size="s" data-test-subj={`syntheticsServiceLocationText--${location.id}`}>
              {location.label} {badge} {invalidBadge}
            </EuiText>
          );
          return {
            ...location,
            label,
            disabled: Boolean(location.isInvalid),
            'data-test-subj': `syntheticsServiceLocation--${location.id}`,
          };
        })}
        idToSelectedMap={checkboxIdToSelectedMap}
        onChange={(id) => onLocationChange(id)}
        onBlur={() => onBlur?.()}
        disabled={readOnly}
      />
    </EuiFormRow>
  );
};

const VALIDATION_ERROR = i18n.translate(
  'xpack.synthetics.monitorManagement.serviceLocationsValidationError',
  {
    defaultMessage: 'At least one service location must be specified',
  }
);

export const LOCATIONS_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.monitorLocationsLabel',
  {
    defaultMessage: 'Monitor locations',
  }
);
