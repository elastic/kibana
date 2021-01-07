/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiAccordion, EuiText, EuiSpacer, EuiLink } from '@elastic/eui';
import { UrlGeneratorsDefinition } from 'src/plugins/share/public';

import { useKibana } from '../../../../../../../../shared_imports';
import { useIsMounted } from '../../../../../use_is_mounted';
import { AddDocumentForm } from '../add_document_form';

import './add_documents_accordion.scss';

const DISCOVER_URL_GENERATOR_ID = 'DISCOVER_APP_URL_GENERATOR';

const i18nTexts = {
  addDocumentsButton: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.addDocumentsAccordion.addDocumentsButtonLabel',
    {
      defaultMessage: 'Add a test document from an index',
    }
  ),
  addDocumentsDescription: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.addDocumentsAccordion.contentDescriptionText',
    {
      defaultMessage: `Provide the document's index and document ID.`,
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
      let isDeprecated: UrlGeneratorsDefinition<typeof DISCOVER_URL_GENERATOR_ID>['isDeprecated'];
      let createUrl: UrlGeneratorsDefinition<typeof DISCOVER_URL_GENERATOR_ID>['createUrl'];

      // This try/catch may not be necessary once
      // https://github.com/elastic/kibana/issues/78344 is addressed
      try {
        ({ isDeprecated, createUrl } = services.urlGenerators.getUrlGenerator(
          DISCOVER_URL_GENERATOR_ID
        ));
      } catch (e) {
        // Discover plugin is not enabled
        setDiscoverLink(undefined);
        return;
      }

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
      <div className="addDocumentsAccordion">
        <EuiText size="s" color="subdued">
          <p>
            {i18nTexts.addDocumentsDescription}
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
      </div>
    </EuiAccordion>
  );
};
