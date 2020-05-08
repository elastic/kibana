/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiFormRow, EuiCodeEditor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useXJsonMode } from '../../../../../../../../src/plugins/es_ui_shared/static/ace_x_json/hooks';
import { ActionParamsProps } from '../../../../types';
import { IndexActionParams } from '.././types';
import { AddMessageVariables } from '../../add_message_variables';

export const IndexParamsFields = ({
  actionParams,
  index,
  editAction,
  messageVariables,
}: ActionParamsProps<IndexActionParams>) => {
  const { documents } = actionParams;
  const { xJsonMode, convertToJson, setXJson, xJson } = useXJsonMode(
    documents && documents.length > 0 ? documents[0] : null
  );
  const onSelectMessageVariable = (variable: string) => {
    const value = (xJson ?? '').concat(` {{${variable}}}`);
    setXJson(value);
    // Keep the documents in sync with the editor content
    onDocumentsChange(convertToJson(value));
  };

  function onDocumentsChange(updatedDocuments: string) {
    try {
      const documentsJSON = JSON.parse(updatedDocuments);
      editAction('documents', [documentsJSON], index);
      // eslint-disable-next-line no-empty
    } catch (e) {}
  }
  return (
    <Fragment>
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.documentsFieldLabel',
          {
            defaultMessage: 'Document to index',
          }
        )}
        labelAppend={
          <AddMessageVariables
            messageVariables={messageVariables}
            onSelectEventHandler={(variable: string) => onSelectMessageVariable(variable)}
            paramsProperty="documents"
          />
        }
      >
        <EuiCodeEditor
          mode={xJsonMode}
          width="100%"
          height="200px"
          theme="github"
          data-test-subj="actionIndexDoc"
          aria-label={i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.jsonDocAriaLabel',
            {
              defaultMessage: 'Code editor',
            }
          )}
          value={xJson}
          onChange={(xjson: string) => {
            setXJson(xjson);
            // Keep the documents in sync with the editor content
            onDocumentsChange(convertToJson(xjson));
          }}
        />
      </EuiFormRow>
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { IndexParamsFields as default };
