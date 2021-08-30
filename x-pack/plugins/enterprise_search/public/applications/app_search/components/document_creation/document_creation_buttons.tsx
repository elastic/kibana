/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import {
  EuiText,
  EuiCode,
  EuiLink,
  EuiSpacer,
  EuiFlexGrid,
  EuiFlexItem,
  EuiCard,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiCardTo } from '../../../shared/react_router_helpers';
import { DOCS_PREFIX, ENGINE_CRAWLER_PATH } from '../../routes';
import { generateEnginePath } from '../engine';

import { DocumentCreationLogic } from './';

interface Props {
  disabled?: boolean;
}

export const DocumentCreationButtons: React.FC<Props> = ({ disabled = false }) => {
  const { openDocumentCreation } = useActions(DocumentCreationLogic);

  const crawlerLink = generateEnginePath(ENGINE_CRAWLER_PATH);

  return (
    <>
      <EuiText color="subdued">
        <p>
          <FormattedMessage
            id="xpack.enterpriseSearch.appSearch.documentCreation.description"
            defaultMessage="How do you want to send documents to your engine for indexing?"
            values={{
              jsonCode: <EuiCode>.json</EuiCode>,
              postCode: <EuiCode>POST</EuiCode>,
              documentsApiLink: (
                <EuiLink target="_blank" href={`${DOCS_PREFIX}/indexing-documents-guide.html`}>
                  documents API
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>
      <EuiSpacer />
      <EuiFlexGrid columns={2}>
        <EuiFlexItem>
          <EuiCard
            layout="horizontal"
            display="subdued"
            titleSize="xs"
            title={i18n.translate(
              'xpack.enterpriseSearch.appSearch.documentCreation.buttons.text',
              { defaultMessage: 'Paste JSON' }
            )}
            description={i18n.translate(
              'xpack.enterpriseSearch.appSearch.documentCreation.paste.description',
              {
                defaultMessage:
                  'Enter an array of valid JSON documents. Each document must be less than 102400 bytes.',
              }
            )}
            icon={<EuiIcon type="indexEdit" size="l" color="primary" />}
            data-test-subj="IndexingPasteJSONButton"
            onClick={() => openDocumentCreation('text')}
            isDisabled={disabled}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            layout="horizontal"
            display="subdued"
            titleSize="xs"
            title={i18n.translate(
              'xpack.enterpriseSearch.appSearch.documentCreation.buttons.file',
              { defaultMessage: 'Upload JSON' }
            )}
            description={i18n.translate(
              'xpack.enterpriseSearch.appSearch.documentCreation.upload.description',
              {
                defaultMessage:
                  'Select a valid JSON file from your computer. Each document object must less than 102400 bytes.',
              }
            )}
            icon={<EuiIcon type="exportAction" size="l" color="primary" />}
            onClick={() => openDocumentCreation('file')}
            isDisabled={disabled}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            layout="horizontal"
            display="subdued"
            titleSize="xs"
            title={i18n.translate('xpack.enterpriseSearch.appSearch.documentCreation.buttons.api', {
              defaultMessage: 'Index from API',
            })}
            description={i18n.translate(
              'xpack.enterpriseSearch.appSearch.documentCreation.api.description',
              {
                defaultMessage: 'Send a POST request to your documents API endpoint.',
              }
            )}
            icon={<EuiIcon type="editorCodeBlock" size="l" color="primary" />}
            onClick={() => openDocumentCreation('api')}
            isDisabled={disabled}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCardTo
            layout="horizontal"
            display="subdued"
            titleSize="xs"
            title={i18n.translate(
              'xpack.enterpriseSearch.appSearch.documentCreation.buttons.crawl',
              { defaultMessage: 'Web crawler' }
            )}
            description={i18n.translate(
              'xpack.enterpriseSearch.appSearch.documentCreation.webCrawler.description',
              {
                defaultMessage:
                  'Use the web crawler to discover, extract, and index your web content into your App Search engines.',
              }
            )}
            icon={<EuiIcon type="globe" size="l" color="primary" />}
            betaBadgeLabel={i18n.translate(
              'xpack.enterpriseSearch.appSearch.documentCreation.buttons.betaTitle',
              { defaultMessage: 'Beta' }
            )}
            betaBadgeTooltipContent={i18n.translate(
              'xpack.enterpriseSearch.appSearch.documentCreation.buttons.betaTooltip',
              {
                defaultMessage:
                  'The Elastic Crawler is not GA. Please help us by reporting any bugs.',
              }
            )}
            to={crawlerLink}
            isDisabled={disabled}
          />
        </EuiFlexItem>
      </EuiFlexGrid>
    </>
  );
};
