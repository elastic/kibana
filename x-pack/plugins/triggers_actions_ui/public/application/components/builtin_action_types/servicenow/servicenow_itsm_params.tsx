/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiFormRow,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { useKibana } from '../../../../common/lib/kibana';
import { ActionParamsProps } from '../../../../types';
import { ServiceNowITSMActionParams, Choice, Options } from './types';
import { TextAreaWithMessageVariables } from '../../text_area_with_message_variables';
import { TextFieldWithMessageVariables } from '../../text_field_with_message_variables';
import { useGetChoices } from './use_get_choices';
import * as i18n from './translations';

const useGetChoicesFields = ['urgency', 'severity', 'impact'];
const defaultOptions: Options = {
  urgency: [],
  severity: [],
  impact: [],
};

const ServiceNowParamsFields: React.FunctionComponent<
  ActionParamsProps<ServiceNowITSMActionParams>
> = ({ actionConnector, actionParams, editAction, index, errors, messageVariables }) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const actionConnectorRef = useRef(actionConnector?.id ?? '');
  const { incident, comments } = useMemo(
    () =>
      actionParams.subActionParams ??
      (({
        incident: {},
        comments: [],
      } as unknown) as ServiceNowITSMActionParams['subActionParams']),
    [actionParams.subActionParams]
  );

  const [options, setOptions] = useState<Options>(defaultOptions);

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

  const onChoicesSuccess = (choices: Choice[]) =>
    setOptions(
      choices.reduce(
        (acc, choice) => ({
          ...acc,
          [choice.element]: [
            ...(acc[choice.element] != null ? acc[choice.element] : []),
            { value: choice.value, text: choice.label },
          ],
        }),
        defaultOptions
      )
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

  return (
    <Fragment>
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
          options={options.urgency}
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
              options={options.severity}
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
              options={options.impact}
              value={incident.impact ?? ''}
              onChange={(e) => editSubActionProperty('impact', e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        error={errors['subActionParams.incident.short_description']}
        isInvalid={
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
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { ServiceNowParamsFields as default };
