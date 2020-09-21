/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiAccordion, EuiText, EuiSpacer, EuiLink } from '@elastic/eui';

import { useKibana } from '../../../../../../shared_imports';

import { ImportDocumentForm } from './import_document_form';

const i18nTexts = {
  addDocumentsButton: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.importDocumentsAccordion.importButtonLabel',
    {
      defaultMessage: 'Import existing documents',
    }
  ),
};

interface Props {
  onAddDocuments: (document: any) => void;
}

export const ImportDocumentsAccordion: FunctionComponent<Props> = ({ onAddDocuments }) => {
  const { services } = useKibana();
  const [discoverLink, setDiscoverLink] = useState('');

  useEffect(() => {
    let unmounted = false;

    const getDiscoverUrl = async (): Promise<void> => {
      if (!unmounted) {
        const discoverUrlGenerator = services.urlGenerators.getUrlGenerator(
          'DISCOVER_APP_URL_GENERATOR'
        );
        const discoverUrl = await discoverUrlGenerator.createUrl({ indexPatternId: undefined });
        setDiscoverLink(discoverUrl);
      }
    };

    getDiscoverUrl();

    return () => {
      unmounted = true;
    };
  }, [services.urlGenerators]);

  return (
    <EuiAccordion
      id="addDocumentsAccordion"
      buttonContent={i18nTexts.addDocumentsButton}
      paddingSize="s"
      data-test-subj="importDocumentsAccordion"
    >
      <>
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.ingestPipelines.pipelineEditor.importDocumentsAccordion.contentDescriptionText"
              defaultMessage="Provide the index name and document ID of the indexed document to test. To explore your existing data, use {discoverLink}."
              values={{
                discoverLink: (
                  <EuiLink href={discoverLink} target="_blank" external>
                    Discover
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <ImportDocumentForm onAddDocuments={onAddDocuments} />
      </>
    </EuiAccordion>
  );
};
