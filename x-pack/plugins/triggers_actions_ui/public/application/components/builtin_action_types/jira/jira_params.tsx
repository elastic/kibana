/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect } from 'react';
import { EuiFormRow, EuiComboBox, EuiLoadingSpinner } from '@elastic/eui';
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
import { useCreateIssueMetadata } from './use_create_issue_metadata';

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
  const {
    issueTypes,
    issueTypesSelectOptions,
    prioritiesSelectOptions,
    hasDescription,
    hasLabels,
    isLoading,
  } = useCreateIssueMetadata({
    http,
    actionConnector,
    selectedIssueType: issueType,
  });

  const labelOptions = labels ? labels.map((label: string) => ({ label })) : [];

  const editSubActionProperty = (key: string, value: {}) => {
    const newProps = { ...actionParams.subActionParams, [key]: value };
    editAction('subActionParams', newProps, index);
  };

  useEffect(() => {
    if (!actionParams.subAction) {
      editAction('subAction', 'pushToService', index);
    }
    if (!savedObjectId && messageVariables?.find((variable) => variable.name === 'alertId')) {
      editSubActionProperty('savedObjectId', '{{alertId}}');
    }
    if (!issueType && issueTypesSelectOptions.length > 0) {
      editSubActionProperty('issueType', issueTypesSelectOptions[0].value as string);
    }
    if (!priority && prioritiesSelectOptions.length > 0) {
      editSubActionProperty('priority', prioritiesSelectOptions[0].value as string);
    }
    if (!labels && hasLabels) {
      editSubActionProperty('labels', []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    actionConnector,
    title,
    description,
    comments,
    issueType,
    priority,
    labels,
    issueTypes,
    issueTypesSelectOptions,
    prioritiesSelectOptions,
  ]);

  return (
    <Fragment>
      <EuiTitle size="s">
        <h3>Incident</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      {isLoading && <EuiLoadingSpinner size="m" />}
      {!isLoading && (
        <>
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
              options={issueTypesSelectOptions}
              value={issueType}
              onChange={(e) => {
                editSubActionProperty('issueType', e.target.value);
              }}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          {prioritiesSelectOptions.length > 0 && (
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
                    options={prioritiesSelectOptions}
                    value={priority}
                    onChange={(e) => {
                      editSubActionProperty('priority', e.target.value);
                    }}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          <EuiSpacer size="m" />
          {hasLabels && (
            <>
              <EuiFlexGroup>
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
                    <EuiComboBox
                      noSuggestions
                      fullWidth
                      selectedOptions={labelOptions}
                      onCreateOption={(searchValue: string) => {
                        const newOptions = [...labelOptions, { label: searchValue }];
                        editSubActionProperty(
                          'labels',
                          newOptions.map((newOption) => newOption.label)
                        );
                      }}
                      onChange={(selectedOptions: Array<{ label: string }>) => {
                        editSubActionProperty(
                          'labels',
                          selectedOptions.map((selectedOption) => selectedOption.label)
                        );
                      }}
                      onBlur={() => {
                        if (!labels) {
                          editSubActionProperty('labels', []);
                        }
                      }}
                      isClearable={true}
                      data-test-subj="labelsComboBox"
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
            </>
          )}
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
          {hasDescription && (
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
          )}
          <TextAreaWithMessageVariables
            index={index}
            editAction={(key, value) => {
              editSubActionProperty(key, [{ commentId: '1', comment: value }]);
            }}
            messageVariables={messageVariables}
            paramsProperty={'comments'}
            inputTargetValue={comments && comments.length > 0 ? comments[0].comment : ''}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.jira.commentsTextAreaFieldLabel',
              {
                defaultMessage: 'Additional comments (optional)',
              }
            )}
            errors={errors.comments as string[]}
          />
        </>
      )}
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { JiraParamsFields as default };
