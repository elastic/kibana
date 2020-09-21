/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiAccordion, EuiText, EuiSpacer } from '@elastic/eui';

import { ImportDocumentForm } from './import_document_form';

const i18nTexts = {
  addDocumentsButton: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.importDocumentsAccordion.importButtonLabel',
    {
      defaultMessage: 'Import existing documents',
    }
  ),
  // TODO add link to Discover
  contentDescription: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.importDocumentsAccordion.contentDescriptionText',
    {
      defaultMessage:
        'Provide the index name and document ID of the indexed document to test. To explore your existing data, use Discover.',
    }
  ),
};

interface Props {
  onAddDocuments: (document: any) => void;
}

export const ImportDocumentsAccordion: FunctionComponent<Props> = ({ onAddDocuments }) => {
  return (
    <EuiAccordion
      id="addDocumentsAccordion"
      buttonContent={i18nTexts.addDocumentsButton}
      paddingSize="s"
      data-test-subj="importDocumentsAccordion"
    >
      <>
        <EuiText size="s" color="subdued">
          <p>{i18nTexts.contentDescription}</p>
        </EuiText>

        <EuiSpacer size="m" />

        <ImportDocumentForm onAddDocuments={onAddDocuments} />
      </>
    </EuiAccordion>
  );
};
