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
import { FormattedMessage } from '@kbn/i18n-react';
import {
  ActionParamsProps,
  AlertHistoryEsIndexConnectorId,
  AlertHistoryDocumentTemplate,
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
  const [isActionConnectorChanged, setIsActionConnectorChanged] = useState<boolean>(false);

  const getDocumentToIndex = (doc: Array<Record<string, any>> | undefined) =>
    doc && doc.length > 0 ? (doc[0] as unknown as string) : undefined;

  const [documentToIndex, setDocumentToIndex] = useState<string | undefined>(
    getDocumentToIndex(documents)
  );
  const [alertHistoryIndexSuffix, setAlertHistoryIndexSuffix] = useState<string>(
    indexOverride ? indexOverride.replace(ALERT_HISTORY_PREFIX, '') : defaultAlertHistoryIndexSuffix
  );
  const [usePreconfiguredSchema, setUsePreconfiguredSchema] = useState<boolean>(false);

  useEffect(() => {
    setDocumentToIndex(getDocumentToIndex(documents));
    if (documents === null) {
      setDocumentToIndex('{}');
    }
  }, [documents]);

  useEffect(() => {
    if (actionConnector?.id === AlertHistoryEsIndexConnectorId) {
      setUsePreconfiguredSchema(true);
      editAction('documents', [JSON.stringify(AlertHistoryDocumentTemplate)], index);
      setDocumentToIndex(JSON.stringify(AlertHistoryDocumentTemplate));
    } else if (isActionConnectorChanged) {
      setUsePreconfiguredSchema(false);
      editAction('documents', undefined, index);
      setDocumentToIndex(undefined);
    }
    setIsActionConnectorChanged(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionConnector?.id]);

  const onDocumentsChange = (updatedDocuments: string) => {
    try {
      const documentsJSON = JSON.parse(updatedDocuments);
      editAction('documents', [documentsJSON], index);
      setDocumentToIndex(updatedDocuments);
    } catch (e) {
      // set document as empty to turn on the validation for non empty valid JSON object
      editAction('documents', [{}], index);
      setDocumentToIndex(undefined);
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
          data-test-subj="resetDefaultIndex"
          onClick={() => {
            editAction('indexOverride', AlertHistoryDefaultIndexName, index);
            setAlertHistoryIndexSuffix(defaultAlertHistoryIndexSuffix);
          }}
        >
          <EuiIcon type="refresh" />
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.rulesList.resetDefaultIndexLabel"
            defaultMessage="Reset default index"
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
        isInvalid={
          errors.indexOverride !== undefined &&
          (errors.indexOverride as string[]) &&
          errors.indexOverride.length > 0
        }
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.preconfiguredIndex',
          {
            defaultMessage: 'Elasticsearch index',
          }
        )}
        labelAppend={resetDefaultIndex}
        helpText={
          <>
            <FormattedMessage
              id="xpack.triggersActionsUI.components.builtinActionTypes.indexAction.preconfiguredIndexHelpText"
              defaultMessage="Documents are indexed into the {alertHistoryIndex} index. "
              values={{ alertHistoryIndex: `${ALERT_HISTORY_PREFIX}${alertHistoryIndexSuffix}` }}
            />
            <EuiLink
              href={docLinks.links.alerting.preconfiguredAlertHistoryConnector}
              target="_blank"
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.components.builtinActionTypes.indexAction.preconfiguredIndexDocLink"
                defaultMessage="View docs."
              />
            </EuiLink>
          </>
        }
      >
        <EuiFieldText
          fullWidth
          data-test-subj="preconfiguredIndexToUse"
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
          {JSON.stringify(AlertHistoryDocumentTemplate, null, 2)}
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
        documentToIndex === null
          ? '{}' // need this to trigger validation
          : documentToIndex
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
        if (!documentToIndex) {
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
