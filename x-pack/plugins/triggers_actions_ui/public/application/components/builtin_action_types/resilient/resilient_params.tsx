/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect, useState } from 'react';
import {
  EuiFormRow,
  EuiComboBox,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
  EuiComboBoxOptionOption,
  EuiSelectOption,
  EuiFormControlLayout,
  EuiIconTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isSome } from 'fp-ts/lib/Option';

import { ActionParamsProps } from '../../../../types';
import { ResilientActionParams } from './types';
import { TextAreaWithMessageVariables } from '../../text_area_with_message_variables';
import { TextFieldWithMessageVariables } from '../../text_field_with_message_variables';

import { useGetIncidentTypes } from './use_get_incident_types';
import { useGetSeverity } from './use_get_severity';
import { extractActionVariable } from '../extract_action_variable';
import { AlertProvidedActionVariables } from '../../../lib/action_variables';

const ResilientParamsFields: React.FunctionComponent<ActionParamsProps<ResilientActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
  messageVariables,
  actionConnector,
  http,
  toastNotifications,
}) => {
  const [firstLoad, setFirstLoad] = useState(false);
  const { title, description, comments, incidentTypes, severityCode, savedObjectId } =
    actionParams.subActionParams || {};

  const isActionBeingConfiguredByAnAlert = messageVariables
    ? isSome(extractActionVariable(messageVariables, AlertProvidedActionVariables.alertId))
    : false;

  const [incidentTypesComboBoxOptions, setIncidentTypesComboBoxOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);

  const [selectedIncidentTypesComboBoxOptions, setSelectedIncidentTypesComboBoxOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);

  const [severitySelectOptions, setSeveritySelectOptions] = useState<EuiSelectOption[]>([]);

  useEffect(() => {
    setFirstLoad(true);
  }, []);

  const {
    isLoading: isLoadingIncidentTypes,
    incidentTypes: allIncidentTypes,
  } = useGetIncidentTypes({
    http,
    toastNotifications,
    actionConnector,
  });

  const { isLoading: isLoadingSeverity, severity } = useGetSeverity({
    http,
    toastNotifications,
    actionConnector,
  });

  const editSubActionProperty = (key: string, value: {}) => {
    const newProps = { ...actionParams.subActionParams, [key]: value };
    editAction('subActionParams', newProps, index);
  };

  useEffect(() => {
    const options = severity.map((s) => ({
      value: s.id.toString(),
      text: s.name,
    }));

    setSeveritySelectOptions(options);
  }, [actionConnector, severity]);

  // Reset parameters when changing connector
  useEffect(() => {
    if (!firstLoad) {
      return;
    }

    setIncidentTypesComboBoxOptions([]);
    setSelectedIncidentTypesComboBoxOptions([]);
    setSeveritySelectOptions([]);
    editAction('subActionParams', { title, comments, description: '', savedObjectId }, index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionConnector]);

  useEffect(() => {
    if (!actionParams.subAction) {
      editAction('subAction', 'pushToService', index);
    }
    if (!savedObjectId && isActionBeingConfiguredByAnAlert) {
      editSubActionProperty(
        'savedObjectId',
        `{{${AlertProvidedActionVariables.alertId}}}:{{${AlertProvidedActionVariables.alertInstanceId}}}`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionConnector, savedObjectId]);

  useEffect(() => {
    setIncidentTypesComboBoxOptions(
      allIncidentTypes
        ? allIncidentTypes.map((type: { id: number; name: string }) => ({
            label: type.name,
            value: type.id.toString(),
          }))
        : []
    );

    const allIncidentTypesAsObject = allIncidentTypes.reduce(
      (acc, type) => ({ ...acc, [type.id.toString()]: type.name }),
      {} as Record<string, string>
    );

    setSelectedIncidentTypesComboBoxOptions(
      incidentTypes
        ? incidentTypes
            .map((type) => ({
              label: allIncidentTypesAsObject[type.toString()],
              value: type.toString(),
            }))
            .filter((type) => type.label != null)
        : []
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionConnector, allIncidentTypes]);

  return (
    <Fragment>
      <EuiTitle size="s">
        <h3>Incident</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.resilient.urgencySelectFieldLabel',
          {
            defaultMessage: 'Incident Type',
          }
        )}
      >
        <EuiComboBox
          fullWidth
          isLoading={isLoadingIncidentTypes}
          isDisabled={isLoadingIncidentTypes}
          data-test-subj="incidentTypeComboBox"
          options={incidentTypesComboBoxOptions}
          selectedOptions={selectedIncidentTypesComboBoxOptions}
          onChange={(selectedOptions: Array<{ label: string; value?: string }>) => {
            setSelectedIncidentTypesComboBoxOptions(
              selectedOptions.map((selectedOption) => ({
                label: selectedOption.label,
                value: selectedOption.value,
              }))
            );

            editSubActionProperty(
              'incidentTypes',
              selectedOptions.map((selectedOption) => selectedOption.value ?? selectedOption.label)
            );
          }}
          onBlur={() => {
            if (!incidentTypes) {
              editSubActionProperty('incidentTypes', []);
            }
          }}
          isClearable={true}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.resilient.severity',
          {
            defaultMessage: 'Severity',
          }
        )}
      >
        <EuiSelect
          isLoading={isLoadingSeverity}
          disabled={isLoadingSeverity}
          fullWidth
          data-test-subj="severitySelect"
          options={severitySelectOptions}
          value={severityCode}
          onChange={(e) => {
            editSubActionProperty('severityCode', e.target.value);
          }}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        error={errors.title}
        isInvalid={errors.title.length > 0 && title !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.resilient.titleFieldLabel',
          {
            defaultMessage: 'Name',
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
      {!isActionBeingConfiguredByAnAlert && (
        <Fragment>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.resilient.savedObjectIdFieldLabel',
              {
                defaultMessage: 'Object ID (optional)',
              }
            )}
          >
            <EuiFormControlLayout
              fullWidth
              append={
                <EuiIconTip
                  content={i18n.translate(
                    'xpack.triggersActionsUI.components.builtinActionTypes.resilient.savedObjectIdFieldHelp',
                    {
                      defaultMessage:
                        'IBM Resilient will associate this action with the ID of a Kibana saved object.',
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
          </EuiFormRow>
          <EuiSpacer size="m" />
        </Fragment>
      )}
      <TextAreaWithMessageVariables
        index={index}
        editAction={editSubActionProperty}
        messageVariables={messageVariables}
        paramsProperty={'description'}
        inputTargetValue={description}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.resilient.descriptionTextAreaFieldLabel',
          {
            defaultMessage: 'Description (optional)',
          }
        )}
        errors={errors.description as string[]}
      />
      <TextAreaWithMessageVariables
        index={index}
        editAction={(key, value) => {
          editSubActionProperty(key, [{ commentId: 'alert-comment', comment: value }]);
        }}
        messageVariables={messageVariables}
        paramsProperty={'comments'}
        inputTargetValue={comments && comments.length > 0 ? comments[0].comment : ''}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.resilient.commentsTextAreaFieldLabel',
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
export { ResilientParamsFields as default };
