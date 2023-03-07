/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';
import { isUndefined } from 'lodash';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { TextFieldWithMessageVariables } from '@kbn/triggers-actions-ui-plugin/public';
import { XmattersActionParams } from '../types';

const severityOptions = [
  {
    value: 'critical',
    text: i18n.translate(
      'xpack.stackConnectors.components.xmatters.severitySelectCriticalOptionLabel',
      {
        defaultMessage: 'Critical',
      }
    ),
  },
  {
    value: 'high',
    text: i18n.translate(
      'xpack.stackConnectors.components.xmatters.severitySelectHighOptionLabel',
      {
        defaultMessage: 'High',
      }
    ),
  },
  {
    value: 'medium',
    text: i18n.translate(
      'xpack.stackConnectors.components.xmatters.severitySelectMediumOptionLabel',
      {
        defaultMessage: 'Medium',
      }
    ),
  },
  {
    value: 'low',
    text: i18n.translate('xpack.stackConnectors.components.xmatters.severitySelectLowOptionLabel', {
      defaultMessage: 'Low',
    }),
  },
  {
    value: 'minimal',
    text: i18n.translate(
      'xpack.stackConnectors.components.xmatters.severitySelectMinimalOptionLabel',
      {
        defaultMessage: 'Minimal',
      }
    ),
  },
];

const XmattersParamsFields: React.FunctionComponent<ActionParamsProps<XmattersActionParams>> = ({
  actionParams,
  editAction,
  index,
  messageVariables,
  errors,
}) => {
  useEffect(() => {
    if (!actionParams) {
      editAction(
        'actionParams',
        {
          signalId: '{{rule.id}}:{{alert.id}}',
          alertActionGroupName: '{{alert.actionGroupName}}',
          ruleName: '{{rule.name}}',
          date: '{{date}}',
          spaceId: '{{rule.spaceId}}',
        },
        index
      );
    } else {
      if (!actionParams.signalId) {
        editAction('signalId', 'test-alert', index);
      }
      if (!actionParams.alertActionGroupName) {
        editAction('alertActionGroupName', 'test-rule:test-alert', index);
      }
      if (!actionParams.ruleName) {
        editAction('ruleName', 'Test Rule', index);
      }
      if (!actionParams.date) {
        editAction('date', new Date().toISOString(), index);
      }
      if (!actionParams.spaceId) {
        editAction('spaceId', 'test-space', index);
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionParams]);
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="xmattersSeverity"
            fullWidth
            label={i18n.translate('xpack.stackConnectors.components.xmatters.severity', {
              defaultMessage: 'Severity',
            })}
          >
            <EuiSelect
              fullWidth
              data-test-subj="severitySelect"
              options={severityOptions}
              hasNoInitialSelection={isUndefined(actionParams.severity)}
              value={actionParams.severity}
              onChange={(e) => {
                editAction('severity', e.target.value, index);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="xmattersTags"
            fullWidth
            label={i18n.translate('xpack.stackConnectors.components.xmatters.tags', {
              defaultMessage: 'Tags',
            })}
          >
            <TextFieldWithMessageVariables
              index={index}
              editAction={editAction}
              messageVariables={messageVariables}
              paramsProperty={'tags'}
              inputTargetValue={actionParams.tags}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { XmattersParamsFields as default };
