/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect, useState, useMemo } from 'react';
import { map } from 'lodash/fp';
import { isSome } from 'fp-ts/lib/Option';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiComboBox,
  EuiSelectOption,
  EuiHorizontalRule,
  EuiSelect,
  EuiFormControlLayout,
  EuiIconTip,
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
import { extractActionVariable } from '../extract_action_variable';
import { AlertProvidedActionVariables } from '../../../lib/action_variables';

const JiraParamsFields: React.FunctionComponent<ActionParamsProps<JiraActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
  messageVariables,
  actionConnector,
  http,
  toastNotifications,
}) => {
  const { title, description, comments, issueType, priority, labels, parent, savedObjectId } =
    actionParams.subActionParams || {};

  const [issueTypesSelectOptions, setIssueTypesSelectOptions] = useState<EuiSelectOption[]>([]);
  const [firstLoad, setFirstLoad] = useState(false);
  const [prioritiesSelectOptions, setPrioritiesSelectOptions] = useState<EuiSelectOption[]>([]);

  const isActionBeingConfiguredByAnAlert = messageVariables
    ? isSome(extractActionVariable(messageVariables, AlertProvidedActionVariables.alertInstanceId))
    : false;

  useEffect(() => {
    setFirstLoad(true);
  }, []);

  const { isLoading: isLoadingIssueTypes, issueTypes } = useGetIssueTypes({
    http,
    toastNotifications,
    actionConnector,
  });

  const { isLoading: isLoadingFields, fields } = useGetFieldsByIssueType({
    http,
    toastNotifications,
    actionConnector,
    issueType,
  });

  const hasLabels = useMemo(() => Object.prototype.hasOwnProperty.call(fields, 'labels'), [fields]);
  const hasDescription = useMemo(
    () => Object.prototype.hasOwnProperty.call(fields, 'description'),
    [fields]
  );
  const hasPriority = useMemo(() => Object.prototype.hasOwnProperty.call(fields, 'priority'), [
    fields,
  ]);
  const hasParent = useMemo(() => Object.prototype.hasOwnProperty.call(fields, 'parent'), [fields]);

  useEffect(() => {
    const options = issueTypes.map((type) => ({
      value: type.id ?? '',
      text: type.name ?? '',
    }));

    setIssueTypesSelectOptions(options);
  }, [issueTypes]);

  useEffect(() => {
    if (issueType != null && fields != null) {
      const priorities = fields.priority?.allowedValues ?? [];
      const options = map(
        (p) => ({
          value: p.name,
          text: p.name,
        }),
        priorities
      );
      setPrioritiesSelectOptions(options);
    }
  }, [fields, issueType]);

  const labelOptions = useMemo(() => (labels ? labels.map((label: string) => ({ label })) : []), [
    labels,
  ]);

  const editSubActionProperty = (key: string, value: any) => {
    const newProps = { ...actionParams.subActionParams, [key]: value };
    editAction('subActionParams', newProps, index);
  };

  // Reset parameters when changing connector
  useEffect(() => {
    if (!firstLoad) {
      return;
    }

    setIssueTypesSelectOptions([]);
    editAction('subActionParams', { title, comments, description: '', savedObjectId }, index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionConnector]);

  // Reset fields when changing connector or issue type
  useEffect(() => {
    if (!firstLoad) {
      return;
    }

    setPrioritiesSelectOptions([]);
    editAction(
      'subActionParams',
      { title, issueType, comments, description: '', savedObjectId },
      index
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueType, savedObjectId]);

  useEffect(() => {
    if (!actionParams.subAction) {
      editAction('subAction', 'pushToService', index);
    }
    if (!savedObjectId && isActionBeingConfiguredByAnAlert) {
      editSubActionProperty('savedObjectId', '{{alertInstanceId}}');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    actionConnector,
    actionParams.subAction,
    index,
    savedObjectId,
    issueTypesSelectOptions,
    issueType,
  ]);

  // Set default issue type
  useEffect(() => {
    if (!issueType && issueTypesSelectOptions.length > 0) {
      editSubActionProperty('issueType', issueTypesSelectOptions[0].value as string);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueTypes, issueTypesSelectOptions]);

  // Set default priority
  useEffect(() => {
    if (!priority && prioritiesSelectOptions.length > 0) {
      editSubActionProperty('priority', prioritiesSelectOptions[0].value as string);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionConnector, issueType, prioritiesSelectOptions]);

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
            value={issueType}
            onChange={(e) => {
              editSubActionProperty('issueType', e.target.value);
            }}
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
                    toastNotifications={toastNotifications}
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
                      value={priority}
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
          <EuiSpacer size="m" />
          {!isActionBeingConfiguredByAnAlert && (
            <Fragment>
              <EuiFormRow
                fullWidth
                label={i18n.translate(
                  'xpack.triggersActionsUI.components.builtinActionTypes.jira.savedObjectIdFieldLabel',
                  {
                    defaultMessage: 'Object ID (optional)',
                  }
                )}
              >
                <EuiFlexItem>
                  <EuiFormControlLayout
                    fullWidth
                    append={
                      <EuiIconTip
                        content={i18n.translate(
                          'xpack.triggersActionsUI.components.builtinActionTypes.jira.savedObjectIdFieldHelp',
                          {
                            defaultMessage:
                              'JIRA will associate this action with the ID of a Kibana saved object.',
                          }
                        )}
                      />
                    }
                  >
                    <TextFieldWithMessageVariables
                      index={index}
                      editAction={editSubActionProperty}
                      messageVariables={messageVariables}
                      paramsProperty={'savedObjectId'}
                      inputTargetValue={savedObjectId}
                    />
                  </EuiFormControlLayout>
                </EuiFlexItem>
              </EuiFormRow>
              <EuiSpacer size="m" />
            </Fragment>
          )}
          {hasLabels && (
            <>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiFormRow
                    fullWidth
                    label={i18n.translate(
                      'xpack.triggersActionsUI.components.builtinActionTypes.jira.impactSelectFieldLabel',
                      {
                        defaultMessage: 'Labels (optional)',
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
      </>
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { JiraParamsFields as default };
