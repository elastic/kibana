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
import { useIsMounted } from '../../../use_is_mounted';
import { AddDocumentForm } from './add_document_form';

const i18nTexts = {
  addDocumentsButton: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.addDocumentsAccordion.addDocumentsButtonLabel',
    {
      defaultMessage: 'Add documents from index',
    }
  ),
};

interface Props {
  onAddDocuments: (document: any) => void;
}

export const AddDocumentsAccordion: FunctionComponent<Props> = ({ onAddDocuments }) => {
  const { services } = useKibana();
  const isMounted = useIsMounted();
  const [discoverLink, setDiscoverLink] = useState<string | undefined>(undefined);

  useEffect(() => {
    const getDiscoverUrl = async (): Promise<void> => {
      const { isDeprecated, createUrl } = services.urlGenerators.getUrlGenerator(
        'DISCOVER_APP_URL_GENERATOR'
      );

      if (isDeprecated) {
        setDiscoverLink(undefined);
        return;
      }

      const discoverUrl = await createUrl({ indexPatternId: undefined });

      if (isMounted.current) {
        setDiscoverLink(discoverUrl);
      }
    };

    getDiscoverUrl();
  }, [isMounted, services.urlGenerators]);

  return (
    <EuiAccordion
      id="addDocumentsAccordion"
      buttonContent={i18nTexts.addDocumentsButton}
      paddingSize="s"
      data-test-subj="addDocumentsAccordion"
    >
      <>
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.ingestPipelines.pipelineEditor.addDocumentsAccordion.contentDescriptionText"
              defaultMessage="Provide the index name and document ID of the indexed document to test."
            />
            {discoverLink && (
              <>
                {' '}
                <FormattedMessage
                  id="xpack.ingestPipelines.pipelineEditor.addDocumentsAccordion.discoverLinkDescriptionText"
                  defaultMessage="To explore your existing data, use {discoverLink}."
                  values={{
                    discoverLink: (
                      <EuiLink href={discoverLink} target="_blank" external>
                        Discover
                      </EuiLink>
                    ),
                  }}
                />
              </>
            )}
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <AddDocumentForm onAddDocuments={onAddDocuments} />
      </>
    </EuiAccordion>
  );
};
