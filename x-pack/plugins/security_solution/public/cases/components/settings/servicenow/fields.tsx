/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { EuiFormRow, EuiSelect, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import * as i18n from './translations';

import { SettingFieldsProps } from '../types';
import { ConnectorTypes, ServiceNowFieldsType } from '../../../../../../case/common/api/connectors';
import { ConnectorCard } from '../card';

const selectOptions = [
  {
    value: '1',
    text: i18n.SEVERITY_HIGH,
  },
  {
    value: '2',
    text: i18n.SEVERITY_MEDIUM,
  },
  {
    value: '3',
    text: i18n.SEVERITY_LOW,
  },
];

const ServiceNowSettingFieldsComponent: React.FunctionComponent<SettingFieldsProps<
  ServiceNowFieldsType
>> = ({ isEdit, fields, connector, onChange }) => {
  const { severity = null, urgency = null, impact = null } = fields || {};

  const [firstLoad, setFirstLoad] = useState(false);

  useEffect(() => {
    onChange({ severity: null, urgency: null, impact: null });
    setFirstLoad(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset parameters when changing connector
  useEffect(() => {
    if (!firstLoad) {
      return;
    }

    onChange({ severity: null, urgency: null, impact: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connector]);
  const listItems = useMemo(
    () => [
      ...(urgency != null
        ? [
            {
              title: i18n.URGENCY,
              description: urgency,
            },
          ]
        : []),
      ...(severity != null
        ? [
            {
              title: i18n.SEVERITY,
              description: severity,
            },
          ]
        : []),
      ...(impact != null
        ? [
            {
              title: i18n.IMPACT,
              description: impact,
            },
          ]
        : []),
    ],
    [urgency, severity, impact]
  );
  return isEdit ? (
    <span data-test-subj={'connector-settings-sn'}>
      <EuiFormRow fullWidth label={i18n.URGENCY}>
        <EuiSelect
          fullWidth
          data-test-subj="urgencySelect"
          options={selectOptions}
          value={urgency ?? undefined}
          hasNoInitialSelection
          onChange={(e) => {
            onChange({ ...fields, urgency: e.target.value });
          }}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow fullWidth label={i18n.SEVERITY}>
            <EuiSelect
              fullWidth
              data-test-subj="severitySelect"
              options={selectOptions}
              value={severity ?? undefined}
              hasNoInitialSelection
              onChange={(e) => {
                onChange({ ...fields, severity: e.target.value });
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow fullWidth label={i18n.IMPACT}>
            <EuiSelect
              fullWidth
              data-test-subj="impactSelect"
              options={selectOptions}
              value={impact ?? undefined}
              hasNoInitialSelection
              onChange={(e) => {
                onChange({ ...fields, impact: e.target.value });
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </span>
  ) : (
    <ConnectorCard
      connectorType={ConnectorTypes.servicenow}
      title={connector.name}
      listItems={listItems}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { ServiceNowSettingFieldsComponent as default };
