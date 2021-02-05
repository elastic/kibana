/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useActions } from 'kea';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
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
            defaultMessage="There are four ways to send documents to your engine for indexing. You can paste raw JSON, upload a {jsonCode} file, {postCode} to the {documentsApiLink} endpoint, or test drive the new Elastic Crawler (beta) to automatically index documents from a URL. Click on your choice below."
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
            title={i18n.translate(
              'xpack.enterpriseSearch.appSearch.documentCreation.buttons.text',
              { defaultMessage: 'Paste JSON' }
            )}
            description=""
            icon={<EuiIcon type="indexEdit" size="xxl" color="primary" />}
            data-test-subj="IndexingPasteJSONButton"
            onClick={() => openDocumentCreation('text')}
            isDisabled={disabled}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            title={i18n.translate(
              'xpack.enterpriseSearch.appSearch.documentCreation.buttons.file',
              { defaultMessage: 'Upload a JSON file' }
            )}
            description=""
            icon={<EuiIcon type="exportAction" size="xxl" color="primary" />}
            onClick={() => openDocumentCreation('file')}
            isDisabled={disabled}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            title={i18n.translate('xpack.enterpriseSearch.appSearch.documentCreation.buttons.api', {
              defaultMessage: 'Index from API',
            })}
            description=""
            icon={<EuiIcon type="editorCodeBlock" size="xxl" color="primary" />}
            onClick={() => openDocumentCreation('api')}
            isDisabled={disabled}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCardTo
            title={i18n.translate(
              'xpack.enterpriseSearch.appSearch.documentCreation.buttons.crawl',
              { defaultMessage: 'Use the Crawler' }
            )}
            description=""
            icon={<EuiIcon type="globe" size="xxl" color="primary" />}
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
