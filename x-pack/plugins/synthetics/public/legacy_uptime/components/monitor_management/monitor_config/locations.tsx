/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { EuiCheckboxGroup, EuiFormRow, EuiText, EuiBadge, EuiIconTip } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useRouteMatch } from 'react-router-dom';
import { formatLocation } from '../../../../../common/utils/location_formatter';
import { monitorManagementListSelector } from '../../../state/selectors';
import { MonitorServiceLocations, LocationStatus } from '../../../../../common/runtime_types';
import { ClientPluginsStart } from '../../../../plugin';
import { MONITOR_EDIT_ROUTE } from '../../../../../common/constants';

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

  const isEditMonitor = useRouteMatch(MONITOR_EDIT_ROUTE);

  const onLocationChange = (optionId: string) => {
    const isSelected = !checkboxIdToSelectedMap[optionId];
    const location = locations.find((loc) => loc.id === optionId);
    if (isSelected) {
      setLocations((prevLocations) =>
        location ? [...prevLocations, formatLocation(location)] : prevLocations
      );
    } else {
      setLocations((prevLocations) => [...prevLocations].filter((loc) => loc.id !== optionId));
    }
    setError(null);
  };

  const errorMessage = error ?? (isInvalid ? VALIDATION_ERROR : null);

  const kServices = useKibana<ClientPluginsStart>().services;

  const canSaveIntegrations: boolean =
    !!kServices?.fleet?.authz.integrations.writeIntegrationPolicies;

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
              <EuiBadge color="warning">{TECH_PREVIEW_LABEL}</EuiBadge>
            ) : null;
          if (!location.isServiceManaged) {
            badge = <EuiBadge color="primary">{PRIVATE_LABEL}</EuiBadge>;
          }
          const invalidBadge = location.isInvalid ? (
            <EuiBadge color="danger">{INVALID_LABEL}</EuiBadge>
          ) : null;

          const isPrivateDisabled =
            !location.isServiceManaged && (Boolean(location.isInvalid) || !canSaveIntegrations);

          const iconTip =
            isPrivateDisabled && !canSaveIntegrations ? (
              <EuiIconTip content={CANNOT_SAVE_INTEGRATION_LABEL} position="right" />
            ) : null;

          const label = (
            <EuiText size="s" data-test-subj={`syntheticsServiceLocationText--${location.id}`}>
              {location.label} {badge} {invalidBadge}
              {iconTip}
            </EuiText>
          );
          return {
            ...location,
            label,
            disabled: isPrivateDisabled && !isEditMonitor?.isExact,
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

export const TECH_PREVIEW_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.techPreviewLabel',
  {
    defaultMessage: 'Tech Preview',
  }
);

export const PRIVATE_LABEL = i18n.translate('xpack.synthetics.monitorManagement.privateLabel', {
  defaultMessage: 'Private',
});

export const INVALID_LABEL = i18n.translate('xpack.synthetics.monitorManagement.invalidLabel', {
  defaultMessage: 'Invalid',
});

export const CANNOT_SAVE_INTEGRATION_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.cannotSaveIntegration',
  {
    defaultMessage:
      'You are not authorized to update integrations. Integrations write permissions are required.',
  }
);
