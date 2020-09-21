/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { EuiFormRow, EuiSelect, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SettingFieldsProps } from '../types';
import { ServiceNowSettingFields } from './types';

const selectOptions = [
  {
    value: '1',
    text: i18n.translate(
      'xpack.securitySolution.components.settings.servicenow.severitySelectHighOptionLabel',
      {
        defaultMessage: 'High',
      }
    ),
  },
  {
    value: '2',
    text: i18n.translate(
      'xpack.securitySolution.components.settings.servicenow.severitySelectMediumOptionLabel',
      {
        defaultMessage: 'Medium',
      }
    ),
  },
  {
    value: '3',
    text: i18n.translate(
      'xpack.securitySolution.components.settings.servicenow.severitySelectLawOptionLabel',
      {
        defaultMessage: 'Low',
      }
    ),
  },
];

const ServiceNowSettingFieldsComponent: React.FunctionComponent<SettingFieldsProps<
  ServiceNowSettingFields
>> = ({ fields, connector, onChange }) => {
  const { severity, urgency, impact } = fields || {};

  const [firstLoad, setFirstLoad] = useState(false);

  useEffect(() => {
    setFirstLoad(true);
  }, []);

  // Reset parameters when changing connector
  useEffect(() => {
    if (!firstLoad) {
      return;
    }

    onChange('severity', null);
    onChange('urgency', null);
    onChange('impact', null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connector]);

  // Set defaults
  useEffect(() => {
    if (!urgency) {
      onChange('urgency', '3');
    }
    if (!impact) {
      onChange('impact', '3');
    }
    if (!severity) {
      onChange('severity', '3');
    }
  }, [urgency, impact, severity, onChange]);

  return (
    <>
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.urgencySelectFieldLabel',
          {
            defaultMessage: 'Urgency',
          }
        )}
      >
        <EuiSelect
          fullWidth
          data-test-subj="urgencySelect"
          options={selectOptions}
          value={urgency}
          onChange={(e) => {
            onChange('urgency', e.target.value);
          }}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.severitySelectFieldLabel',
              {
                defaultMessage: 'Severity',
              }
            )}
          >
            <EuiSelect
              fullWidth
              data-test-subj="severitySelect"
              options={selectOptions}
              value={severity}
              onChange={(e) => {
                onChange('severity', e.target.value);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.impactSelectFieldLabel',
              {
                defaultMessage: 'Impact',
              }
            )}
          >
            <EuiSelect
              fullWidth
              data-test-subj="impactSelect"
              options={selectOptions}
              value={impact}
              onChange={(e) => {
                onChange('impact', e.target.value);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ServiceNowSettingFieldsComponent as default };
