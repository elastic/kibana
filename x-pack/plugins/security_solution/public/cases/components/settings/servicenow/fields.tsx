/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { EuiFormRow, EuiSelect, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SettingFieldsProps } from '../types';
import { ServiceNowFieldsType } from '../../../../../../case/common/api/connectors';

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
  ServiceNowFieldsType
>> = ({ fields, connector, onChange }) => {
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

  return (
    <span data-test-subj={'connector-settings-sn'}>
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
              value={severity ?? undefined}
              hasNoInitialSelection
              onChange={(e) => {
                onChange({ ...fields, severity: e.target.value });
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
  );
};

// eslint-disable-next-line import/no-default-export
export { ServiceNowSettingFieldsComponent as default };
