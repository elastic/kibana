/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { EuiCallOut, EuiFormRow, EuiSpacer } from '@elastic/eui';
import * as i18n from './translations';
import { ActionParamsProps } from '../../../../types';
import { SwimlaneActionConnector, SwimlaneActionParams, SwimlaneConnectorType } from './types';
import { TextFieldWithMessageVariables } from '../../text_field_with_message_variables';
import { TextAreaWithMessageVariables } from '../../text_area_with_message_variables';

const SwimlaneParamsFields: React.FunctionComponent<ActionParamsProps<SwimlaneActionParams>> = ({
  actionParams,
  editAction,
  index,
  messageVariables,
  actionConnector,
}) => {
  const { incident, comments } = useMemo(
    () =>
      actionParams.subActionParams ??
      ({
        incident: {},
        comments: [],
      } as unknown as SwimlaneActionParams['subActionParams']),
    [actionParams.subActionParams]
  );

  const actionConnectorRef = useRef(actionConnector?.id ?? '');

  const { mappings, connectorType } = (actionConnector as unknown as SwimlaneActionConnector)
    .config;
  const { hasAlertId, hasRuleName, hasComments, hasSeverity } = useMemo(
    () => ({
      hasAlertId: mappings.alertIdConfig != null,
      hasRuleName: mappings.ruleNameConfig != null,
      hasComments: mappings.commentsConfig != null,
      hasSeverity: mappings.severityConfig != null,
    }),
    [
      mappings.alertIdConfig,
      mappings.ruleNameConfig,
      mappings.commentsConfig,
      mappings.severityConfig,
    ]
  );

  /**
   * The user can use either a connector of type alerts or all.
   * If the connector is of type all we should check if all
   * required field have been configured.
   */
  const showMappingWarning =
    connectorType === SwimlaneConnectorType.Cases || !hasRuleName || !hasAlertId;

  const editSubActionProperty = useCallback(
    (key: string, value: any) => {
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
    [editAction, incident, comments, index]
  );

  const editComment = useCallback(
    (key, value) => {
      editSubActionProperty(key, [{ commentId: '1', comment: value }]);
    },
    [editSubActionProperty]
  );

  useEffect(() => {
    if (actionConnector != null && actionConnectorRef.current !== actionConnector.id) {
      actionConnectorRef.current = actionConnector.id;
      editAction(
        'subActionParams',
        {
          incident: { alertId: '{{alert.id}}', ruleName: '{{rule.name}}' },
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
          incident: { alertId: '{{alert.id}}', ruleName: '{{rule.name}}' },
          comments: [],
        },
        index
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionParams]);

  return !showMappingWarning ? (
    <>
      {hasSeverity && (
        <>
          <EuiFormRow fullWidth label={i18n.SW_SEVERITY_FIELD_LABEL}>
            <TextFieldWithMessageVariables
              index={index}
              data-test-subj="severity"
              editAction={editSubActionProperty}
              messageVariables={messageVariables}
              paramsProperty={'severity'}
              inputTargetValue={incident.severity ?? undefined}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
        </>
      )}
      {hasComments && (
        <TextAreaWithMessageVariables
          data-test-subj="comments"
          index={index}
          editAction={editComment}
          messageVariables={messageVariables}
          paramsProperty={'comments'}
          inputTargetValue={comments && comments.length > 0 ? comments[0].comment : undefined}
          label={i18n.SW_COMMENTS_FIELD_LABEL}
        />
      )}
    </>
  ) : (
    <EuiCallOut title={i18n.EMPTY_MAPPING_WARNING_TITLE} color="warning" iconType="help">
      {i18n.EMPTY_MAPPING_WARNING_DESC}
    </EuiCallOut>
  );
};

// eslint-disable-next-line import/no-default-export
export { SwimlaneParamsFields as default };
