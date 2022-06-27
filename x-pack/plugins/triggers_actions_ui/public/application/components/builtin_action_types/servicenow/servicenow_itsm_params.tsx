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
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useKibana } from '../../../../common/lib/kibana';
import { ActionParamsProps } from '../../../../types';
import { ServiceNowITSMActionParams, Choice, Fields } from './types';
import { TextAreaWithMessageVariables } from '../../text_area_with_message_variables';
import { TextFieldWithMessageVariables } from '../../text_field_with_message_variables';
import { useGetChoices } from './use_get_choices';
import { choicesToEuiOptions, DEFAULT_CORRELATION_ID } from './helpers';

import * as i18n from './translations';

const useGetChoicesFields = ['urgency', 'severity', 'impact', 'category', 'subcategory'];
const defaultFields: Fields = {
  category: [],
  subcategory: [],
  urgency: [],
  severity: [],
  impact: [],
  priority: [],
};

const ServiceNowParamsFields: React.FunctionComponent<
  ActionParamsProps<ServiceNowITSMActionParams>
> = ({ actionConnector, actionParams, editAction, index, errors, messageVariables }) => {
  const {
    docLinks,
    http,
    notifications: { toasts },
  } = useKibana().services;

  const isDeprecatedActionConnector = actionConnector?.isDeprecated;

  const actionConnectorRef = useRef(actionConnector?.id ?? '');
  const { incident, comments } = useMemo(
    () =>
      actionParams.subActionParams ??
      ({
        incident: {},
        comments: [],
      } as unknown as ServiceNowITSMActionParams['subActionParams']),
    [actionParams.subActionParams]
  );

  const [choices, setChoices] = useState<Fields>(defaultFields);

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
      editSubActionProperty(key, [{ commentId: '1', comment: value }]);
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

  const categoryOptions = useMemo(() => choicesToEuiOptions(choices.category), [choices.category]);
  const urgencyOptions = useMemo(() => choicesToEuiOptions(choices.urgency), [choices.urgency]);
  const severityOptions = useMemo(() => choicesToEuiOptions(choices.severity), [choices.severity]);
  const impactOptions = useMemo(() => choicesToEuiOptions(choices.impact), [choices.impact]);

  const subcategoryOptions = useMemo(
    () =>
      choicesToEuiOptions(
        choices.subcategory.filter(
          (subcategory) => subcategory.dependent_value === incident.category
        )
      ),
    [choices.subcategory, incident.category]
  );

  const { isLoading: isLoadingChoices } = useGetChoices({
    http,
    toastNotifications: toasts,
    actionConnector,
    fields: useGetChoicesFields,
    onSuccess: onChoicesSuccess,
  });

  useEffect(() => {
    if (actionConnector != null && actionConnectorRef.current !== actionConnector.id) {
      actionConnectorRef.current = actionConnector.id;
      editAction(
        'subActionParams',
        {
          incident: { correlation_id: DEFAULT_CORRELATION_ID },
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
          incident: { correlation_id: DEFAULT_CORRELATION_ID },
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
        <h3>{i18n.INCIDENT}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFormRow fullWidth label={i18n.URGENCY_LABEL}>
        <EuiSelect
          fullWidth
          data-test-subj="urgencySelect"
          hasNoInitialSelection
          isLoading={isLoadingChoices}
          disabled={isLoadingChoices}
          options={urgencyOptions}
          value={incident.urgency ?? ''}
          onChange={(e) => editSubActionProperty('urgency', e.target.value)}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow fullWidth label={i18n.SEVERITY_LABEL}>
            <EuiSelect
              fullWidth
              data-test-subj="severitySelect"
              hasNoInitialSelection
              isLoading={isLoadingChoices}
              disabled={isLoadingChoices}
              options={severityOptions}
              value={incident.severity ?? ''}
              onChange={(e) => editSubActionProperty('severity', e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow fullWidth label={i18n.IMPACT_LABEL}>
            <EuiSelect
              fullWidth
              data-test-subj="impactSelect"
              hasNoInitialSelection
              isLoading={isLoadingChoices}
              disabled={isLoadingChoices}
              options={impactOptions}
              value={incident.impact ?? ''}
              onChange={(e) => editSubActionProperty('impact', e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
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
          {subcategoryOptions?.length > 0 ? (
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
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {!isDeprecatedActionConnector && (
        <>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow
                fullWidth
                label={i18n.CORRELATION_ID}
                helpText={
                  <EuiLink href={docLinks.links.alerting.serviceNowAction} target="_blank">
                    <FormattedMessage
                      id="xpack.triggersActionsUI.components.builtinActionTypes.serviceNowAction.correlationIDHelpLabel"
                      defaultMessage="Identifier for updating incidents"
                    />
                  </EuiLink>
                }
              >
                <TextFieldWithMessageVariables
                  index={index}
                  editAction={editSubActionProperty}
                  messageVariables={messageVariables}
                  paramsProperty={'correlation_id'}
                  inputTargetValue={incident?.correlation_id ?? undefined}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow fullWidth label={i18n.CORRELATION_DISPLAY}>
                <TextFieldWithMessageVariables
                  index={index}
                  editAction={editSubActionProperty}
                  messageVariables={messageVariables}
                  paramsProperty={'correlation_display'}
                  inputTargetValue={incident?.correlation_display ?? undefined}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </>
      )}
      <EuiFlexGroup>
        <EuiFlexItem>
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
              inputTargetValue={incident?.short_description ?? undefined}
              errors={errors['subActionParams.incident.short_description'] as string[]}
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
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ServiceNowParamsFields as default };
