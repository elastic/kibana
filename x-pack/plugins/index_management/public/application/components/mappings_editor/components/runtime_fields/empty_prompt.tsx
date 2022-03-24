/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiEmptyPrompt, EuiLink, EuiButton } from '@elastic/eui';

interface Props {
  createField: () => void;
  runtimeFieldsDocsUri: string;
}

export const EmptyPrompt: FunctionComponent<Props> = ({ createField, runtimeFieldsDocsUri }) => {
  return (
    <EuiEmptyPrompt
      iconType="managementApp"
      data-test-subj="emptyList"
      title={
        <h2 data-test-subj="title">
          {i18n.translate('xpack.idxMgmt.mappingsEditor.runtimeFields.emptyPromptTitle', {
            defaultMessage: 'Start by creating a runtime field',
          })}
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.idxMgmt.mappingsEditor.runtimeFields.emptyPromptDescription"
            defaultMessage="Define a field in the mapping and evaluate it at search time."
          />
          <br />
          <EuiLink
            href={runtimeFieldsDocsUri}
            target="_blank"
            data-test-subj="learnMoreLink"
            external
          >
            {i18n.translate(
              'xpack.idxMgmt.mappingsEditor.runtimeFields.emptyPromptDocumentionLink',
              {
                defaultMessage: 'Learn more.',
              }
            )}
          </EuiLink>
        </p>
      }
      actions={
        <EuiButton
          onClick={() => createField()}
          iconType="plusInCircle"
          data-test-subj="createRuntimeFieldButton"
          fill
        >
          {i18n.translate('xpack.idxMgmt.mappingsEditor.runtimeFields.emptyPromptButtonLabel', {
            defaultMessage: 'Create runtime field',
          })}
        </EuiButton>
      }
    />
  );
};
