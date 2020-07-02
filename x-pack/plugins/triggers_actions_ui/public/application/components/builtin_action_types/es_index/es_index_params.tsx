/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { ActionParamsProps } from '../../../../types';
import { IndexActionParams } from '.././types';
import { JsonEditorWithMessageVariables } from '../../json_editor_with_message_variables';

export const IndexParamsFields = ({
  actionParams,
  index,
  editAction,
  messageVariables,
}: ActionParamsProps<IndexActionParams>) => {
  const { documents } = actionParams;

  const onDocumentsChange = (updatedDocuments: string) => {
    try {
      const documentsJSON = JSON.parse(updatedDocuments);
      editAction('documents', [documentsJSON], index);
      // eslint-disable-next-line no-empty
    } catch (e) {}
  };

  return (
    <JsonEditorWithMessageVariables
      messageVariables={messageVariables}
      paramsProperty={'documents'}
      inputTargetValue={
        documents && documents.length > 0 ? ((documents[0] as unknown) as string) : ''
      }
      label={i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.documentsFieldLabel',
        {
          defaultMessage: 'Document to index',
        }
      )}
      aria-label={i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.jsonDocAriaLabel',
        {
          defaultMessage: 'Code editor',
        }
      )}
      onDocumentsChange={onDocumentsChange}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { IndexParamsFields as default };
