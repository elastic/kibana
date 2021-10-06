/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiFormRow,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiSwitch,
} from '@elastic/eui';
import { useKibana } from '../../../../common/lib/kibana';
import { ActionParamsProps } from '../../../../types';
import { TextAreaWithMessageVariables } from '../../text_area_with_message_variables';
import { TextFieldWithMessageVariables } from '../../text_field_with_message_variables';

import * as i18n from './translations';
import { useGetChoices } from './use_get_choices';
import { ServiceNowSIRActionParams, Fields, Choice, ServiceNowActionConnector } from './types';
import { choicesToEuiOptions, isLegacyConnector } from './helpers';
import { UPDATE_INCIDENT_VARIABLE, NOT_UPDATE_INCIDENT_VARIABLE } from './config';

const useGetChoicesFields = ['category', 'subcategory', 'priority'];
const defaultFields: Fields = {
  category: [],
  subcategory: [],
  priority: [],
};

const valuesToString = (value: string | string[] | null): string | undefined => {
  if (Array.isArray(value)) {
    return value.join(',');
  }

  return value ?? undefined;
};

const ServiceNowSIRParamsFields: React.FunctionComponent<
  ActionParamsProps<ServiceNowSIRActionParams>
> = ({ actionConnector, actionParams, editAction, index, errors, messageVariables }) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const isOldConnector = isLegacyConnector(actionConnector as unknown as ServiceNowActionConnector);

  const actionConnectorRef = useRef(actionConnector?.id ?? '');
  const { incident, comments } = useMemo(
    () =>
      actionParams.subActionParams ??
      ({
        incident: {},
        comments: [],
      } as unknown as ServiceNowSIRActionParams['subActionParams']),
    [actionParams.subActionParams]
  );

  const hasUpdateIncident =
    incident.correlation_id != null && incident.correlation_id === UPDATE_INCIDENT_VARIABLE;
  const [updateIncident, setUpdateIncident] = useState<boolean>(hasUpdateIncident);
  const [choices, setChoices] = useState<Fields>(defaultFields);

  const correlationID = updateIncident ? UPDATE_INCIDENT_VARIABLE : NOT_UPDATE_INCIDENT_VARIABLE;

  const editSubActionProperty = useCallback(
    (key: string, value: any) => {
      const newProps =
        key !== 'comments'
          ? {
              incident: { ...incident, [key]: value },
              comments,
            }
          : { incident, [key]: value };
      editAction('subActionParams', newProps, index);
    },
    [comments, editAction, incident, index]
  );

  const editComment = useCallback(
    (key, value) => {
      if (value.length > 0) {
        editSubActionProperty(key, [{ commentId: '1', comment: value }]);
      }
    },
    [editSubActionProperty]
  );

  const onChoicesSuccess = useCallback((values: Choice[]) => {
    setChoices(
      values.reduce(
        (acc, value) => ({
          ...acc,
          [value.element]: [...(acc[value.element] != null ? acc[value.element] : []), value],
        }),
        defaultFields
      )
    );
  }, []);

  const onUpdateIncidentSwitchChange = useCallback(() => {
    const newCorrelationID = !updateIncident
      ? UPDATE_INCIDENT_VARIABLE
      : NOT_UPDATE_INCIDENT_VARIABLE;
    editSubActionProperty('correlation_id', newCorrelationID);
    setUpdateIncident(!updateIncident);
  }, [editSubActionProperty, updateIncident]);

  const { isLoading: isLoadingChoices } = useGetChoices({
    http,
    toastNotifications: toasts,
    actionConnector,
    // Not having a memoized fields variable will cause infinitive API calls.
    fields: useGetChoicesFields,
    onSuccess: onChoicesSuccess,
  });

  const categoryOptions = useMemo(() => choicesToEuiOptions(choices.category), [choices.category]);
  const priorityOptions = useMemo(() => choicesToEuiOptions(choices.priority), [choices.priority]);

  const subcategoryOptions = useMemo(
    () =>
      choicesToEuiOptions(
        choices.subcategory.filter(
          (subcategory) => subcategory.dependent_value === incident.category
        )
      ),
    [choices.subcategory, incident.category]
  );

  useEffect(() => {
    if (actionConnector != null && actionConnectorRef.current !== actionConnector.id) {
      actionConnectorRef.current = actionConnector.id;
      editAction(
        'subActionParams',
        {
          incident: { correlation_id: correlationID, correlation_display: 'Alerting' },
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
          incident: { correlation_id: correlationID, correlation_display: 'Alerting' },
          comments: [],
        },
        index
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionParams]);

  return (
    <>
      <EuiTitle size="s">
        <h3>{i18n.SECURITY_INCIDENT}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        error={errors['subActionParams.incident.short_description']}
        isInvalid={
          errors['subActionParams.incident.short_description'] !== undefined &&
          errors['subActionParams.incident.short_description'].length > 0 &&
          incident.short_description !== undefined
        }
        label={i18n.SHORT_DESCRIPTION_LABEL}
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubActionProperty}
          messageVariables={messageVariables}
          paramsProperty={'short_description'}
          inputTargetValue={incident?.short_description}
          errors={errors['subActionParams.incident.short_description'] as string[]}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow fullWidth label={i18n.SOURCE_IP_LABEL} helpText={i18n.SOURCE_IP_HELP_TEXT}>
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubActionProperty}
          messageVariables={messageVariables}
          paramsProperty={'source_ip'}
          inputTargetValue={valuesToString(incident?.source_ip)}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow fullWidth label={i18n.DEST_IP_LABEL} helpText={i18n.DEST_IP_HELP_TEXT}>
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubActionProperty}
          messageVariables={messageVariables}
          paramsProperty={'dest_ip'}
          inputTargetValue={valuesToString(incident?.dest_ip)}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow fullWidth label={i18n.MALWARE_URL_LABEL} helpText={i18n.MALWARE_URL_HELP_TEXT}>
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubActionProperty}
          messageVariables={messageVariables}
          paramsProperty={'malware_url'}
          inputTargetValue={valuesToString(incident?.malware_url)}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow fullWidth label={i18n.MALWARE_HASH_LABEL} helpText={i18n.MALWARE_HASH_HELP_TEXT}>
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubActionProperty}
          messageVariables={messageVariables}
          paramsProperty={'malware_hash'}
          inputTargetValue={valuesToString(incident?.malware_hash)}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow fullWidth label={i18n.PRIORITY_LABEL}>
        <EuiSelect
          fullWidth
          data-test-subj="prioritySelect"
          hasNoInitialSelection
          isLoading={isLoadingChoices}
          disabled={isLoadingChoices}
          options={priorityOptions}
          value={incident.priority ?? undefined}
          onChange={(e) => editSubActionProperty('priority', e.target.value)}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow fullWidth label={i18n.CATEGORY_LABEL}>
            <EuiSelect
              fullWidth
              data-test-subj="categorySelect"
              hasNoInitialSelection
              isLoading={isLoadingChoices}
              disabled={isLoadingChoices}
              options={categoryOptions}
              value={incident.category ?? undefined}
              onChange={(e) => {
                editAction(
                  'subActionParams',
                  {
                    incident: { ...incident, category: e.target.value, subcategory: null },
                    comments,
                  },
                  index
                );
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow fullWidth label={i18n.SUBCATEGORY_LABEL}>
            <EuiSelect
              fullWidth
              data-test-subj="subcategorySelect"
              hasNoInitialSelection
              isLoading={isLoadingChoices}
              disabled={isLoadingChoices}
              options={subcategoryOptions}
              // Needs an empty string instead of undefined to select the blank option when changing categories
              value={incident.subcategory ?? ''}
              onChange={(e) => editSubActionProperty('subcategory', e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <TextAreaWithMessageVariables
        index={index}
        editAction={editSubActionProperty}
        messageVariables={messageVariables}
        paramsProperty={'description'}
        inputTargetValue={incident.description ?? undefined}
        label={i18n.DESCRIPTION_LABEL}
      />
      <TextAreaWithMessageVariables
        index={index}
        editAction={editComment}
        messageVariables={messageVariables}
        paramsProperty={'comments'}
        inputTargetValue={comments && comments.length > 0 ? comments[0].comment : undefined}
        label={i18n.COMMENTS_LABEL}
      />
      <EuiSpacer size="m" />
      {!isOldConnector && (
        <EuiFormRow id="update-incident-form-row" fullWidth label={i18n.UPDATE_INCIDENT_LABEL}>
          <EuiSwitch
            label={updateIncident ? i18n.ON : i18n.OFF}
            name="update-incident-switch"
            checked={updateIncident}
            onChange={onUpdateIncidentSwitchChange}
            aria-describedby="update-incident-form-row"
          />
        </EuiFormRow>
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ServiceNowSIRParamsFields as default };
