/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

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
  const { incident, comments } = useMemo(
    () =>
      actionParams.subActionParams ??
      ({
        incident: {},
        comments: [],
      } as unknown as JiraActionParams['subActionParams']),
    [actionParams.subActionParams]
  );
  const actionConnectorRef = useRef(actionConnector?.id ?? '');

  const { isLoading: isLoadingIssueTypes, issueTypes } = useGetIssueTypes({
    http,
    toastNotifications: toasts,
    actionConnector,
  });

  const { isLoading: isLoadingFields, fields } = useGetFieldsByIssueType({
    http,
    toastNotifications: toasts,
    actionConnector,
    issueType: incident.issueType ?? '',
  });

  const editSubActionProperty = useCallback(
    (key: string, value: any) => {
      if (key === 'issueType') {
        return editAction(
          'subActionParams',
          {
            incident: { issueType: value },
            comments,
          },
          index
        );
      }

      if (key === 'comments') {
        return editAction('subActionParams', { incident, comments: value }, index);
      }

      return editAction(
        'subActionParams',
        {
          incident: { ...incident, [key]: value },
          comments,
        },
        index
      );
    },
    [comments, editAction, incident, index]
  );
  const editComment = useCallback(
    (key, value) => {
      editSubActionProperty(key, [{ commentId: '1', comment: value }]);
    },
    [editSubActionProperty]
  );

  const { hasLabels, hasDescription, hasPriority, hasParent } = useMemo(
    () =>
      fields != null
        ? {
            hasLabels: Object.prototype.hasOwnProperty.call(fields, 'labels'),
            hasDescription: Object.prototype.hasOwnProperty.call(fields, 'description'),
            hasPriority: Object.prototype.hasOwnProperty.call(fields, 'priority'),
            hasParent: Object.prototype.hasOwnProperty.call(fields, 'parent'),
          }
        : { hasLabels: false, hasDescription: false, hasPriority: false, hasParent: false },
    [fields]
  );

  const issueTypesSelectOptions: EuiSelectOption[] = useMemo(() => {
    const doesIssueTypeExist =
      incident.issueType != null && issueTypes.length
        ? issueTypes.some((t) => t.id === incident.issueType)
        : true;
    if ((!incident.issueType || !doesIssueTypeExist) && issueTypes.length > 0) {
      editSubActionProperty('issueType', issueTypes[0].id ?? '');
    }
    return issueTypes.map((type) => ({
      value: type.id ?? '',
      text: type.name ?? '',
    }));
  }, [editSubActionProperty, incident, issueTypes]);

  const prioritiesSelectOptions: EuiSelectOption[] = useMemo(() => {
    if (incident.issueType != null && fields != null) {
      const priorities = fields.priority != null ? fields.priority.allowedValues : [];
      const doesPriorityExist = priorities.some((p) => p.name === incident.priority);

      if ((!incident.priority || !doesPriorityExist) && priorities.length > 0) {
        editSubActionProperty('priority', priorities[0].name ?? '');
      }
      return priorities.map((p: { id: string; name: string }) => {
        return {
          value: p.name,
          text: p.name,
        };
      });
    }
    return [];
  }, [editSubActionProperty, fields, incident.issueType, incident.priority]);

  useEffect(() => {
    if (!isLoadingFields && !hasPriority && incident.priority != null) {
      editSubActionProperty('priority', null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPriority, isLoadingFields]);

  const labelOptions = useMemo(
    () => (incident.labels ? incident.labels.map((label: string) => ({ label })) : []),
    [incident.labels]
  );

  useEffect(() => {
    if (actionConnector != null && actionConnectorRef.current !== actionConnector.id) {
      actionConnectorRef.current = actionConnector.id;
      editAction(
        'subActionParams',
        {
          incident: {},
          comments: [],
        },
        index
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionConnector]);

  useEffect(() => {
    if (!actionParams.subAction) {
      editAction('subAction', 'pushToService', index);
    }
    if (!actionParams.subActionParams) {
      editAction(
        'subActionParams',
        {
          incident: {},
          comments: [],
        },
        index
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionParams]);

  const areLabelsInvalid =
    errors['subActionParams.incident.labels'] != null &&
    errors['subActionParams.incident.labels'] !== undefined &&
    errors['subActionParams.incident.labels'].length > 0 &&
    incident.labels !== undefined;

  return (
    <>
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
            value={incident.issueType ?? undefined}
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
                    data-test-subj="parent-search"
                    selectedValue={incident.parent}
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
                      value={incident.priority ?? undefined}
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
            data-test-subj="summary-row"
            fullWidth
            error={errors['subActionParams.incident.summary']}
            isInvalid={
              errors['subActionParams.incident.summary'] !== undefined &&
              errors['subActionParams.incident.summary'].length > 0 &&
              incident.summary !== undefined
            }
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
              inputTargetValue={incident.summary ?? undefined}
              errors={errors['subActionParams.incident.summary'] as string[]}
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
                    error={errors['subActionParams.incident.labels'] as string[]}
                    isInvalid={areLabelsInvalid}
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
                        if (!incident.labels) {
                          editSubActionProperty('labels', []);
                        }
                      }}
                      isClearable={true}
                      data-test-subj="labelsComboBox"
                      isInvalid={areLabelsInvalid}
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
              inputTargetValue={incident.description ?? undefined}
              label={i18n.translate(
                'xpack.triggersActionsUI.components.builtinActionTypes.jira.descriptionTextAreaFieldLabel',
                {
                  defaultMessage: 'Description',
                }
              )}
            />
          )}
          <TextAreaWithMessageVariables
            index={index}
            editAction={editComment}
            messageVariables={messageVariables}
            paramsProperty={'comments'}
            inputTargetValue={comments && comments.length > 0 ? comments[0].comment : undefined}
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.jira.commentsTextAreaFieldLabel',
              {
                defaultMessage: 'Additional comments',
              }
            )}
          />
        </>
      </>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { JiraParamsFields as default };
