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
import { ActionParamsProps } from '../../../../types';
import { XmattersActionParams } from '../types';
import { TextFieldWithMessageVariables } from '../../text_field_with_message_variables';

const severityOptions = [
  {
    value: 'critical',
    text: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.severitySelectCriticalOptionLabel',
      {
        defaultMessage: 'Critical',
      }
    ),
  },
  {
    value: 'high',
    text: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.severitySelectHighOptionLabel',
      {
        defaultMessage: 'High',
      }
    ),
  },
  {
    value: 'medium',
    text: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.severitySelectMediumOptionLabel',
      {
        defaultMessage: 'Medium',
      }
    ),
  },
  {
    value: 'low',
    text: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.severitySelectLowOptionLabel',
      {
        defaultMessage: 'Low',
      }
    ),
  },
  {
    value: 'minimal',
    text: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.severitySelectMinimalOptionLabel',
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
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.severity',
              {
                defaultMessage: 'Severity',
              }
            )}
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
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.tags',
              {
                defaultMessage: 'Tags',
              }
            )}
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
