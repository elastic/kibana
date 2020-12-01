/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useCallback, useEffect, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiComboBox,
  EuiSelectOption,
  EuiHorizontalRule,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';

import { ActionParamsProps } from '../../../../types';
import { TextAreaWithMessageVariables } from '../../text_area_with_message_variables';
import { TextFieldWithMessageVariables } from '../../text_field_with_message_variables';
import { JiraActionParams } from './types';
import { useGetIssueTypes } from './use_get_issue_types';
import { useGetFieldsByIssueType } from './use_get_fields_by_issue_type';
import { SearchIssues } from './search_issues';
import { useKibana } from '../../../../common/lib/kibana';

const JiraParamsFields: React.FunctionComponent<ActionParamsProps<JiraActionParams>> = ({
  actionConnector,
  actionParams,
  editAction,
  errors,
  index,
  messageVariables,
}) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const {
    incident: { summary, description, issueType, priority, labels, parent },
    comments,
  } = useMemo(
    () =>
      actionParams.subActionParams ?? {
        incident: {
          summary: null,
          description: null,
          issueType: null,
          priority: null,
          labels: null,
          parent: null,
        },
        comments: [],
      },
    [actionParams.subActionParams]
  );

  const { isLoading: isLoadingIssueTypes, issueTypes } = useGetIssueTypes({
    http,
    toastNotifications: toasts,
    actionConnector,
  });

  const { isLoading: isLoadingFields, fields } = useGetFieldsByIssueType({
    http,
    toastNotifications: toasts,
    actionConnector,
    issueType: issueType ?? '',
  });
  const editSubActionProperty = useCallback(
    (key: string, value: any) => {
      const newProps =
        key !== 'comments'
          ? {
              ...actionParams.subActionParams,
              incident: {
                ...(actionParams.subActionParams ? actionParams.subActionParams.incident : {}),
                [key]: value,
              },
            }
          : { ...actionParams.subActionParams, [key]: value };
      editAction('subActionParams', newProps, index);
    },
    [actionParams.subActionParams, editAction, index]
  );

  const hasLabels = useMemo(() => Object.prototype.hasOwnProperty.call(fields, 'labels'), [fields]);
  const hasDescription = useMemo(
    () => Object.prototype.hasOwnProperty.call(fields, 'description'),
    [fields]
  );
  const hasPriority = useMemo(() => Object.prototype.hasOwnProperty.call(fields, 'priority'), [
    fields,
  ]);
  const hasParent = useMemo(() => Object.prototype.hasOwnProperty.call(fields, 'parent'), [fields]);
  const issueTypesSelectOptions: EuiSelectOption[] = useMemo(() => {
    if (!issueType && issueTypes.length > 0) {
      editSubActionProperty('issueType', issueTypes[0].id ?? '');
    }
    return issueTypes.map((type) => ({
      value: type.id ?? '',
      text: type.name ?? '',
    }));
  }, [editSubActionProperty, issueType, issueTypes]);
  const prioritiesSelectOptions: EuiSelectOption[] = useMemo(() => {
    if (issueType != null && fields != null) {
      const priorities = fields.priority != null ? fields.priority.allowedValues : [];
      if (!priority && priorities.length > 0) {
        editSubActionProperty('priority', priorities[0].id ?? '');
      }
      return priorities.map((p: { id: string; name: string }) => ({
        value: p.name,
        text: p.name,
      }));
    }
    return [];
  }, [editSubActionProperty, fields, issueType, priority]);

  const labelOptions = useMemo(() => (labels ? labels.map((label: string) => ({ label })) : []), [
    labels,
  ]);

  useEffect(() => {
    if (!actionParams.subAction) {
      editAction('subAction', 'pushToService', index);
    }
    return () => {
      editAction(
        'subActionParams',
        {
          incident: {},
          comments: [],
        },
        index
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Fragment>
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
            isLoading={isLoadingIssueTypes}
            disabled={isLoadingIssueTypes || isLoadingFields}
            data-test-subj="issueTypeSelect"
            options={issueTypesSelectOptions}
            value={issueType ?? undefined}
            onChange={(e) => editSubActionProperty('issueType', e.target.value)}
          />
        </EuiFormRow>
        <EuiHorizontalRule />
        {hasParent && (
          <>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow
                  fullWidth
                  label={i18n.translate(
                    'xpack.triggersActionsUI.components.builtinActionTypes.jira.parentIssueSearchLabel',
                    {
                      defaultMessage: 'Parent issue',
                    }
                  )}
                >
                  <SearchIssues
                    selectedValue={parent}
                    http={http}
                    toastNotifications={toasts}
                    actionConnector={actionConnector}
                    onChange={(parentIssueKey) => {
                      editSubActionProperty('parent', parentIssueKey);
                    }}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
          </>
        )}
        <>
          {hasPriority && (
            <>
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
                      isLoading={isLoadingFields}
                      disabled={isLoadingIssueTypes || isLoadingFields}
                      data-test-subj="prioritySelect"
                      options={prioritiesSelectOptions}
                      value={priority ?? undefined}
                      onChange={(e) => {
                        editSubActionProperty('priority', e.target.value);
                      }}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
            </>
          )}
          <EuiFormRow
            fullWidth
            error={errors.summary}
            isInvalid={errors.summary.length > 0 && summary !== undefined}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.jira.summaryFieldLabel',
              {
                defaultMessage: 'Summary (required)',
              }
            )}
          >
            <TextFieldWithMessageVariables
              index={index}
              editAction={editSubActionProperty}
              messageVariables={messageVariables}
              paramsProperty={'summary'}
              inputTargetValue={summary ?? undefined}
              errors={errors.summary as string[]}
            />
          </EuiFormRow>
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
                      isLoading={isLoadingFields}
                      isDisabled={isLoadingIssueTypes || isLoadingFields}
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
          {hasDescription && (
            <TextAreaWithMessageVariables
              index={index}
              editAction={editSubActionProperty}
              messageVariables={messageVariables}
              paramsProperty={'description'}
              inputTargetValue={description ?? undefined}
              label={i18n.translate(
                'xpack.triggersActionsUI.components.builtinActionTypes.jira.descriptionTextAreaFieldLabel',
                {
                  defaultMessage: 'Description',
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
            inputTargetValue={comments && comments.length > 0 ? comments[0].comment : undefined}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.jira.commentsTextAreaFieldLabel',
              {
                defaultMessage: 'Additional comments',
              }
            )}
            errors={errors.comments as string[]}
          />
        </>
      </>
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { JiraParamsFields as default };
