/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ActionParamsProps } from '../../../../types';
import { IndexActionParams } from '.././types';
import { JsonEditorWithMessageVariables } from '../../json_editor_with_message_variables';

export const IndexParamsFields = ({
  actionParams,
  index,
  editAction,
  messageVariables,
  docLinks,
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
    <>
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
        helpText={
          <EuiLink
            href={`${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/index-action-type.html#index-action-configuration`}
            target="_blank"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.components.builtinActionTypes.indexAction.indexDocumentHelpLabel"
              defaultMessage="Index document example."
            />
          </EuiLink>
        }
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { IndexParamsFields as default };
