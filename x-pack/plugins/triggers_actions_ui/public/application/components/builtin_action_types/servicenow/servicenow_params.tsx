/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useCallback, useEffect, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { ActionParamsProps } from '../../../../types';
import { ServiceNowActionParams } from './types';
import { TextAreaWithMessageVariables } from '../../text_area_with_message_variables';
import { TextFieldWithMessageVariables } from '../../text_field_with_message_variables';

const selectOptions = [
  {
    value: '1',
    text: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.severitySelectHighOptionLabel',
      { defaultMessage: 'High' }
    ),
  },
  {
    value: '2',
    text: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.severitySelectMediumOptionLabel',
      { defaultMessage: 'Medium' }
    ),
  },
  {
    value: '3',
    text: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.servicenow.severitySelectLawOptionLabel',
      { defaultMessage: 'Low' }
    ),
  },
];

const ServiceNowParamsFields: React.FunctionComponent<
  ActionParamsProps<ServiceNowActionParams>
> = ({ actionConnector, actionParams, editAction, index, errors, messageVariables }) => {
  const actionConnectorRef = useRef(actionConnector?.id ?? '');
  const { incident, comments } = useMemo(
    () =>
      actionParams.subActionParams ??
      (({
        incident: {},
        comments: [],
      } as unknown) as ServiceNowActionParams['subActionParams']),
    [actionParams.subActionParams]
  );

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
        <h3>
          {i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.title',
            { defaultMessage: 'Incident' }
          )}
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.urgencySelectFieldLabel',
          { defaultMessage: 'Urgency' }
        )}
      >
        <EuiSelect
          fullWidth
          data-test-subj="urgencySelect"
          hasNoInitialSelection
          options={selectOptions}
          value={incident.urgency ?? undefined}
          onChange={(e) => editSubActionProperty('urgency', e.target.value)}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.severitySelectFieldLabel',
              { defaultMessage: 'Severity' }
            )}
          >
            <EuiSelect
              fullWidth
              data-test-subj="severitySelect"
              hasNoInitialSelection
              options={selectOptions}
              value={incident.severity ?? undefined}
              onChange={(e) => editSubActionProperty('severity', e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.impactSelectFieldLabel',
              { defaultMessage: 'Impact' }
            )}
          >
            <EuiSelect
              fullWidth
              data-test-subj="impactSelect"
              hasNoInitialSelection
              options={selectOptions}
              value={incident.impact ?? undefined}
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
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.titleFieldLabel',
          { defaultMessage: 'Short description (required)' }
        )}
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
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.descriptionTextAreaFieldLabel',
          { defaultMessage: 'Description' }
        )}
      />
      <TextAreaWithMessageVariables
        index={index}
        editAction={editComment}
        messageVariables={messageVariables}
        paramsProperty={'comments'}
        inputTargetValue={comments && comments.length > 0 ? comments[0].comment : undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.commentsTextAreaFieldLabel',
          { defaultMessage: 'Additional comments' }
        )}
      />
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { ServiceNowParamsFields as default };
