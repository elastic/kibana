/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect } from 'react';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiSelect } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { EuiTitle } from '@elastic/eui';

import { useAppDependencies } from '../../../app_context';
import { ActionParamsProps } from '../../../../types';
import { TextAreaWithMessageVariables } from '../../text_area_with_message_variables';
import { TextFieldWithMessageVariables } from '../../text_field_with_message_variables';
import { JiraActionParams } from './types';
import { getCreateIssueMetadata } from './api';

const JiraParamsFields: React.FunctionComponent<ActionParamsProps<JiraActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
  messageVariables,
  actionConnector,
}) => {
  const { http } = useAppDependencies();
  const { title, description, comments, issueType, priority, labels, savedObjectId } =
    actionParams.subActionParams || {};

  const selectOptions = [
    {
      value: '1',
      text: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.jira.severitySelectHighOptionLabel',
        {
          defaultMessage: 'High',
        }
      ),
    },
    {
      value: '2',
      text: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.jira.severitySelectMediumOptionLabel',
        {
          defaultMessage: 'Medium',
        }
      ),
    },
    {
      value: '3',
      text: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.jira.severitySelectLawOptionLabel',
        {
          defaultMessage: 'Low',
        }
      ),
    },
  ];

  const editSubActionProperty = (key: string, value: {}) => {
    const newProps = { ...actionParams.subActionParams, [key]: value };
    editAction('subActionParams', newProps, index);
  };

  useEffect(() => {
    let cancel = false;
    const fetchData = async () => {
      const createIssueMetadata = await getCreateIssueMetadata({
        http,
        connectorId: actionConnector.id,
      });
      console.log('createIssueMetadata', createIssueMetadata);
    };
    fetchData();
    return () => {
      cancel = true;
    };
  }, [http, actionConnector]);

  useEffect(() => {
    if (!actionParams.subAction) {
      editAction('subAction', 'pushToService', index);
    }
    if (!savedObjectId && messageVariables?.find((variable) => variable.name === 'alertId')) {
      editSubActionProperty('savedObjectId', '{{alertId}}');
    }
    if (!issueType) {
      editSubActionProperty('issueType', '3');
    }
    if (!priority) {
      editSubActionProperty('priority', '3');
    }
    if (!labels) {
      editSubActionProperty('labels', '3');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, comments, issueType, priority, labels]);

  return (
    <Fragment>
      <EuiTitle size="s">
        <h3>Incident</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.jira.urgencySelectFieldLabel',
          {
            defaultMessage: 'Issue type',
          }
        )}
      >
        <EuiSelect
          fullWidth
          data-test-subj="issueTypeSelect"
          options={selectOptions}
          value={issueType}
          onChange={(e) => {
            editSubActionProperty('issueType', e.target.value);
          }}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.jira.severitySelectFieldLabel',
              {
                defaultMessage: 'Priority',
              }
            )}
          >
            <EuiSelect
              fullWidth
              data-test-subj="prioritySelect"
              options={selectOptions}
              value={priority}
              onChange={(e) => {
                editSubActionProperty('priority', e.target.value);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.jira.impactSelectFieldLabel',
              {
                defaultMessage: 'Labels',
              }
            )}
          >
            <EuiSelect
              fullWidth
              data-test-subj="labelsSelect"
              options={selectOptions}
              value={labels}
              onChange={(e) => {
                editSubActionProperty('labels', e.target.value);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        error={errors.title}
        isInvalid={errors.title.length > 0 && title !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.jira.titleFieldLabel',
          {
            defaultMessage: 'Summary',
          }
        )}
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubActionProperty}
          messageVariables={messageVariables}
          paramsProperty={'title'}
          inputTargetValue={title}
          errors={errors.title as string[]}
        />
      </EuiFormRow>
      <TextAreaWithMessageVariables
        index={index}
        editAction={editSubActionProperty}
        messageVariables={messageVariables}
        paramsProperty={'description'}
        inputTargetValue={description}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.jira.descriptionTextAreaFieldLabel',
          {
            defaultMessage: 'Description (optional)',
          }
        )}
        errors={errors.description as string[]}
      />
      <TextAreaWithMessageVariables
        index={index}
        editAction={editSubActionProperty}
        messageVariables={messageVariables}
        paramsProperty={'comments'}
        inputTargetValue={comments}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.jira.commentsTextAreaFieldLabel',
          {
            defaultMessage: 'Additional comments (optional)',
          }
        )}
        errors={errors.comments as string[]}
      />
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { JiraParamsFields as default };
