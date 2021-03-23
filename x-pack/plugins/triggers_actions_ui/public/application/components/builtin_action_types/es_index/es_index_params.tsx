/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiIcon,
  EuiText,
  EuiCodeBlock,
  EuiFieldText,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  ActionParamsProps,
  AlertHistoryEsIndexConnectorId,
  AlertHistoryDocumentSchema,
  AlertHistoryDefaultIndexName,
  ALERT_HISTORY_PREFIX,
} from '../../../../types';
import { IndexActionParams } from '.././types';
import { JsonEditorWithMessageVariables } from '../../json_editor_with_message_variables';
import { useKibana } from '../../../../common/lib/kibana';

export const IndexParamsFields = ({
  actionParams,
  index,
  editAction,
  messageVariables,
  errors,
  actionConnector,
}: ActionParamsProps<IndexActionParams>) => {
  const { docLinks } = useKibana().services;
  const { documents, indexOverride } = actionParams;
  const defaultAlertHistoryIndexSuffix = AlertHistoryDefaultIndexName.replace(
    ALERT_HISTORY_PREFIX,
    ''
  );

  const [alertHistoryIndexSuffix, setAlertHistoryIndexSuffix] = useState<string>(
    defaultAlertHistoryIndexSuffix
  );
  const [usePreconfiguredSchema, setUsePreconfiguredSchema] = useState<boolean>(false);

  useEffect(() => {
    if (actionConnector?.id === AlertHistoryEsIndexConnectorId) {
      setUsePreconfiguredSchema(true);
      onDocumentsChange(JSON.stringify(AlertHistoryDocumentSchema));
    } else {
      editAction('documents', null, index);
      setUsePreconfiguredSchema(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionConnector?.id]);

  const onDocumentsChange = (updatedDocuments: string) => {
    try {
      const documentsJSON = JSON.parse(updatedDocuments);
      editAction('documents', [documentsJSON], index);
    } catch (e) {
      // set document as empty to turn on the validation for non empty valid JSON object
      editAction('documents', [{}], index);
    }
  };

  const documentsFieldLabel = i18n.translate(
    'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.documentsFieldLabel',
    {
      defaultMessage: 'Document to index',
    }
  );

  const resetDefaultIndex =
    indexOverride && indexOverride !== AlertHistoryDefaultIndexName ? (
      <EuiText size="xs">
        <EuiLink
          onClick={() => {
            editAction('indexOverride', AlertHistoryDefaultIndexName, index);
            setAlertHistoryIndexSuffix(defaultAlertHistoryIndexSuffix);
          }}
        >
          <EuiIcon type="refresh" />
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.alertsList.refreshAlertsButtonLabel"
            defaultMessage="Reset Default Index"
          />
        </EuiLink>
      </EuiText>
    ) : (
      <></>
    );

  const preconfiguredDocumentSchema = (
    <>
      <EuiFormRow
        fullWidth
        error={errors.indexOverride as string[]}
        isInvalid={(errors.indexOverride as string[]) && errors.indexOverride.length > 0}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.preconfiguredIndex',
          {
            defaultMessage: 'ES Index',
          }
        )}
        labelAppend={resetDefaultIndex}
        helpText={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.preconfiguredIndexHelpText',
          {
            defaultMessage: 'Documents will be indexed into "{alertHistoryIndex}"',
            values: { alertHistoryIndex: `${ALERT_HISTORY_PREFIX}${alertHistoryIndexSuffix}` },
          }
        )}
      >
        <EuiFieldText
          fullWidth
          prepend={ALERT_HISTORY_PREFIX}
          value={alertHistoryIndexSuffix}
          onChange={(e) => {
            editAction('indexOverride', `${ALERT_HISTORY_PREFIX}${e.target.value}`, index);
            setAlertHistoryIndexSuffix(e.target.value);
          }}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow fullWidth label={documentsFieldLabel}>
        <EuiCodeBlock
          language="json"
          fontSize="s"
          paddingSize="s"
          data-test-subj="preconfiguredDocumentToIndex"
        >
          {JSON.stringify(AlertHistoryDocumentSchema, null, 2)}
        </EuiCodeBlock>
      </EuiFormRow>
    </>
  );

  const jsonDocumentEditor = (
    <JsonEditorWithMessageVariables
      messageVariables={messageVariables}
      paramsProperty={'documents'}
      data-test-subj="documentToIndex"
      inputTargetValue={
        documents === null
          ? '{}' // need this to trigger validation
          : documents && documents.length > 0
          ? ((documents[0] as unknown) as string)
          : undefined
      }
      label={documentsFieldLabel}
      aria-label={i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.jsonDocAriaLabel',
        {
          defaultMessage: 'Code editor',
        }
      )}
      errors={errors.documents as string[]}
      onDocumentsChange={onDocumentsChange}
      helpText={
        <EuiLink href={docLinks.links.alerting.indexAction} target="_blank">
          <FormattedMessage
            id="xpack.triggersActionsUI.components.builtinActionTypes.indexAction.indexDocumentHelpLabel"
            defaultMessage="Index document example."
          />
        </EuiLink>
      }
      onBlur={() => {
        if (
          !(documents && documents.length > 0 ? ((documents[0] as unknown) as string) : undefined)
        ) {
          // set document as empty to turn on the validation for non empty valid JSON object
          onDocumentsChange('{}');
        }
      }}
    />
  );

  return usePreconfiguredSchema ? preconfiguredDocumentSchema : jsonDocumentEditor;
};

// eslint-disable-next-line import/no-default-export
export { IndexParamsFields as default };
