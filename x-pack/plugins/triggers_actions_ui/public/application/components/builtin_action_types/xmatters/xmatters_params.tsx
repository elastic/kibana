/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="xmattersAlertActionGroupName"
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.alertActionGroupName',
              {
                defaultMessage: 'Alert Action Group Name',
              }
            )}
          >
            <TextFieldWithMessageVariables
              index={index}
              editAction={editAction}
              messageVariables={messageVariables}
              paramsProperty={'alertActionGroupName'}
              defaultValue={'{{alertActionGroupName}}'}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="xmattersAlertId"
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.alertId',
              {
                defaultMessage: 'Alert ID',
              }
            )}
          >
            <TextFieldWithMessageVariables
              index={index}
              editAction={editAction}
              messageVariables={messageVariables}
              paramsProperty={'alertId'}
              defaultValue={'{{alertId}}'}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="xmattersAlertName"
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.alertName',
              {
                defaultMessage: 'Alert name',
              }
            )}
          >
            <TextFieldWithMessageVariables
              index={index}
              editAction={editAction}
              messageVariables={messageVariables}
              paramsProperty={'alertName'}
              inputTargetValue={actionParams.alertName}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="xmattersDate"
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.date',
              {
                defaultMessage: 'Date',
              }
            )}
          >
            <TextFieldWithMessageVariables
              index={index}
              editAction={editAction}
              messageVariables={messageVariables}
              paramsProperty={'date'}
              inputTargetValue={actionParams.date}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
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
            id="xmattersSpaceId"
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.spaceId',
              {
                defaultMessage: 'Space ID',
              }
            )}
          >
            <TextFieldWithMessageVariables
              index={index}
              editAction={editAction}
              messageVariables={messageVariables}
              paramsProperty={'spaceId'}
              inputTargetValue={actionParams.spaceId}
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
