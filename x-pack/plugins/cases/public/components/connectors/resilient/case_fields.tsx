/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFormRow,
  EuiSelect,
  EuiSelectOption,
  EuiSpacer,
} from '@elastic/eui';

import { useKibana } from '../../../common/lib/kibana';
import { ConnectorFieldsProps } from '../types';
import { useGetIncidentTypes } from './use_get_incident_types';
import { useGetSeverity } from './use_get_severity';

import * as i18n from './translations';
import { ConnectorTypes, ResilientFieldsType } from '../../../../common/api';
import { ConnectorCard } from '../card';

const ResilientFieldsComponent: React.FunctionComponent<ConnectorFieldsProps<ResilientFieldsType>> =
  // TODO: Fix this manually. Issue #123375
  // eslint-disable-next-line react/display-name
  ({ isEdit = true, fields, connector, onChange }) => {
    const init = useRef(true);
    const { incidentTypes = null, severityCode = null } = fields ?? {};

    const { http, notifications } = useKibana().services;

    const { isLoading: isLoadingIncidentTypes, incidentTypes: allIncidentTypes } =
      useGetIncidentTypes({
        http,
        toastNotifications: notifications.toasts,
        connector,
      });

    const { isLoading: isLoadingSeverity, severity } = useGetSeverity({
      http,
      toastNotifications: notifications.toasts,
      connector,
    });

    const severitySelectOptions: EuiSelectOption[] = useMemo(
      () =>
        severity.map((s) => ({
          value: s.id.toString(),
          text: s.name,
        })),
      [severity]
    );

    const incidentTypesComboBoxOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(
      () =>
        allIncidentTypes
          ? allIncidentTypes.map((type: { id: number; name: string }) => ({
              label: type.name,
              value: type.id.toString(),
            }))
          : [],
      [allIncidentTypes]
    );
    const listItems = useMemo(
      () => [
        ...(incidentTypes != null && incidentTypes.length > 0
          ? [
              {
                title: i18n.INCIDENT_TYPES_LABEL,
                description: allIncidentTypes
                  .filter((type) => incidentTypes.includes(type.id.toString()))
                  .map((type) => type.name)
                  .join(', '),
              },
            ]
          : []),
        ...(severityCode != null && severityCode.length > 0
          ? [
              {
                title: i18n.SEVERITY_LABEL,
                description:
                  severity.find((severityObj) => severityObj.id.toString() === severityCode)
                    ?.name ?? '',
              },
            ]
          : []),
      ],
      [incidentTypes, severityCode, allIncidentTypes, severity]
    );

    const onFieldChange = useCallback(
      (key, value) => {
        onChange({
          ...fields,
          incidentTypes,
          severityCode,
          [key]: value,
        });
      },
      [incidentTypes, severityCode, onChange, fields]
    );

    const selectedIncidentTypesComboBoxOptionsMemo = useMemo(() => {
      const allIncidentTypesAsObject = allIncidentTypes.reduce(
        (acc, type) => ({ ...acc, [type.id.toString()]: type.name }),
        {} as Record<string, string>
      );
      return incidentTypes
        ? incidentTypes
            .map((type) => ({
              label: allIncidentTypesAsObject[type.toString()],
              value: type.toString(),
            }))
            .filter((type) => type.label != null)
        : [];
    }, [allIncidentTypes, incidentTypes]);

    const onIncidentChange = useCallback(
      (selectedOptions: Array<{ label: string; value?: string }>) => {
        onFieldChange(
          'incidentTypes',
          selectedOptions.map((selectedOption) => selectedOption.value ?? selectedOption.label)
        );
      },
      [onFieldChange]
    );

    const onIncidentBlur = useCallback(() => {
      if (!incidentTypes) {
        onFieldChange('incidentTypes', []);
      }
    }, [incidentTypes, onFieldChange]);

    // Set field at initialization
    useEffect(() => {
      if (init.current) {
        init.current = false;
        onChange({ incidentTypes, severityCode });
      }
    }, [incidentTypes, onChange, severityCode]);

    return isEdit ? (
      <span data-test-subj={'connector-fields-resilient'}>
        <EuiFormRow fullWidth label={i18n.INCIDENT_TYPES_LABEL}>
          <EuiComboBox
            data-test-subj="incidentTypeComboBox"
            fullWidth
            isClearable={true}
            isDisabled={isLoadingIncidentTypes}
            isLoading={isLoadingIncidentTypes}
            onBlur={onIncidentBlur}
            onChange={onIncidentChange}
            options={incidentTypesComboBoxOptions}
            placeholder={i18n.INCIDENT_TYPES_PLACEHOLDER}
            selectedOptions={selectedIncidentTypesComboBoxOptionsMemo}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFormRow fullWidth label={i18n.SEVERITY_LABEL}>
          <EuiSelect
            data-test-subj="severitySelect"
            disabled={isLoadingSeverity}
            fullWidth
            hasNoInitialSelection
            isLoading={isLoadingSeverity}
            onChange={(e) => onFieldChange('severityCode', e.target.value)}
            options={severitySelectOptions}
            value={severityCode ?? undefined}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
      </span>
    ) : (
      <ConnectorCard
        connectorType={ConnectorTypes.resilient}
        isLoading={isLoadingIncidentTypes || isLoadingSeverity}
        listItems={listItems}
        title={connector.name}
      />
    );
  };

// eslint-disable-next-line import/no-default-export
export { ResilientFieldsComponent as default };
