/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiFormRow,
  EuiComboBox,
  EuiSelect,
  EuiSpacer,
  EuiComboBoxOptionOption,
  EuiSelectOption,
} from '@elastic/eui';

import { useKibana } from '../../../../common/lib/kibana';
import { SettingFieldsProps } from '../types';

import { useGetIncidentTypes } from './use_get_incident_types';
import { useGetSeverity } from './use_get_severity';

import * as i18n from './translations';
import { ResilientFieldsType } from '../../../../../../case/common/api/connectors';

const ResilientSettingFieldsComponent: React.FunctionComponent<SettingFieldsProps<
  ResilientFieldsType
>> = ({ fields, connector, onChange }) => {
  const { incidentTypes = null, severityCode = null } = fields || {};

  const [firstLoad, setFirstLoad] = useState(false);
  const [incidentTypesComboBoxOptions, setIncidentTypesComboBoxOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);

  const [selectedIncidentTypesComboBoxOptions, setSelectedIncidentTypesComboBoxOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);

  const [severitySelectOptions, setSeveritySelectOptions] = useState<EuiSelectOption[]>([]);

  const { http, notifications } = useKibana().services;

  useEffect(() => {
    setFirstLoad(true);
    onChange({ incidentTypes: incidentTypes ?? null, severityCode: severityCode ?? null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    isLoading: isLoadingIncidentTypes,
    incidentTypes: allIncidentTypes,
  } = useGetIncidentTypes({
    http,
    toastNotifications: notifications.toasts,
    connector,
  });

  const { isLoading: isLoadingSeverity, severity } = useGetSeverity({
    http,
    toastNotifications: notifications.toasts,
    connector,
  });

  useEffect(() => {
    const options = severity.map((s) => ({
      value: s.id.toString(),
      text: s.name,
    }));

    setSeveritySelectOptions(options);
  }, [connector, severity]);

  // Reset parameters when changing connector
  useEffect(() => {
    if (!firstLoad) {
      return;
    }

    setIncidentTypesComboBoxOptions([]);
    setSelectedIncidentTypesComboBoxOptions([]);
    setSeveritySelectOptions([]);

    onChange({ incidentTypes: null, severityCode: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connector]);

  useEffect(() => {
    setIncidentTypesComboBoxOptions(
      allIncidentTypes
        ? allIncidentTypes.map((type: { id: number; name: string }) => ({
            label: type.name,
            value: type.id.toString(),
          }))
        : []
    );

    const allIncidentTypesAsObject = allIncidentTypes.reduce(
      (acc, type) => ({ ...acc, [type.id.toString()]: type.name }),
      {} as Record<string, string>
    );

    setSelectedIncidentTypesComboBoxOptions(
      incidentTypes
        ? incidentTypes
            .map((type) => ({
              label: allIncidentTypesAsObject[type.toString()],
              value: type.toString(),
            }))
            .filter((type) => type.label != null)
        : []
    );
  }, [connector, allIncidentTypes, incidentTypes]);

  return (
    <span data-test-subj={'connector-settings-resilient'}>
      <EuiFormRow fullWidth label={i18n.INCIDENT_TYPES_LABEL}>
        <EuiComboBox
          fullWidth
          isLoading={isLoadingIncidentTypes}
          isDisabled={isLoadingIncidentTypes}
          data-test-subj="incidentTypeComboBox"
          options={incidentTypesComboBoxOptions}
          selectedOptions={selectedIncidentTypesComboBoxOptions}
          placeholder={i18n.INCIDENT_TYPES_PLACEHOLDER}
          onChange={(selectedOptions: Array<{ label: string; value?: string }>) => {
            setSelectedIncidentTypesComboBoxOptions(
              selectedOptions.map((selectedOption) => ({
                label: selectedOption.label,
                value: selectedOption.value,
              }))
            );

            onChange({
              ...fields,
              incidentTypes: selectedOptions.map(
                (selectedOption) => selectedOption.value ?? selectedOption.label
              ),
            });
          }}
          onBlur={() => {
            if (!incidentTypes) {
              onChange({ ...fields, incidentTypes: [] });
            }
          }}
          isClearable={true}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow fullWidth label={i18n.SEVERITY_LABEL}>
        <EuiSelect
          isLoading={isLoadingSeverity}
          disabled={isLoadingSeverity}
          fullWidth
          hasNoInitialSelection
          data-test-subj="severitySelect"
          options={severitySelectOptions}
          value={severityCode ?? undefined}
          onChange={(e) => {
            onChange({ ...fields, severityCode: e.target.value });
          }}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
    </span>
  );
};

// eslint-disable-next-line import/no-default-export
export { ResilientSettingFieldsComponent as default };
