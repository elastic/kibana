/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useLocation } from 'react-router-dom';

import { Location } from 'history';
import { useActions } from 'kea';

import {
  EuiEmptyPrompt,
  EuiText,
  EuiTitle,
  EuiImage,
  EuiLink,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCard,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { parseQueryParams } from '../../../shared/query_params';
import { EuiCardTo } from '../../../shared/react_router_helpers';
import { INDEXING_DOCS_URL, ENGINE_CRAWLER_PATH } from '../../routes';
import { generateEnginePath } from '../engine';

import illustration from './illustration.svg';

import { DocumentCreationLogic } from '.';

interface Props {
  isFlyout?: boolean;
  disabled?: boolean;
}

export const DocumentCreationButtons: React.FC<Props> = ({
  isFlyout = false,
  disabled = false,
}) => {
  const { openDocumentCreation } = useActions(DocumentCreationLogic);

  const { search } = useLocation() as Location;
  const { method } = parseQueryParams(search);

  useEffect(() => {
    switch (method) {
      case 'json':
        openDocumentCreation('json');
        break;
      case 'api':
        openDocumentCreation('api');
        break;
    }
  }, []);

  const crawlerLink = generateEnginePath(ENGINE_CRAWLER_PATH);

  const helperText = (
    <p>
      {i18n.translate('xpack.enterpriseSearch.appSearch.documentCreation.helperText', {
        defaultMessage:
          'There are three ways to send documents to your engine for indexing. You can paste or upload a JSON file, POST to the documents API endpoint, or use the  Elastic Web Crawler to automatically index documents from a URL.',
      })}
    </p>
  );

  const emptyState = (
    <EuiFlexItem>
      <EuiEmptyPrompt
        icon={
          <EuiImage
            size="fullWidth"
            src={illustration}
            alt={i18n.translate(
              'xpack.enterpriseSearch.appSearch.documentCreation.buttons.emptyStateIllustrationAltText',
              { defaultMessage: 'Illustration' }
            )}
          />
        }
        title={
          <h2>
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.documentCreation.buttons.emptyStateTitle',
              { defaultMessage: 'Add documents' }
            )}
          </h2>
        }
        layout="horizontal"
        hasBorder
        color="plain"
        body={helperText}
        footer={
          <>
            <EuiTitle size="xxs">
              <span>
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.documentCreation.buttons.emptyStateFooterText',
                  { defaultMessage: 'Want to learn more about indexing documents?' }
                )}
              </span>
            </EuiTitle>{' '}
            <EuiLink href={INDEXING_DOCS_URL} target="_blank">
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.documentCreation.buttons.emptyStateFooterLink',
                { defaultMessage: 'Read documentation' }
              )}
            </EuiLink>
          </>
        }
      />
    </EuiFlexItem>
  );

  const flyoutHeader = (
    <>
      <EuiText color="subdued">{helperText}</EuiText>
      <EuiSpacer />
    </>
  );

  return (
    <>
      {isFlyout && flyoutHeader}
      <EuiFlexGroup alignItems="flexStart">
        <EuiFlexItem grow>
          <EuiCardTo
            hasBorder
            layout="horizontal"
            title={i18n.translate(
              'xpack.enterpriseSearch.appSearch.documentCreation.buttons.crawlTitle',
              { defaultMessage: 'Use the Crawler' }
            )}
            description={i18n.translate(
              'xpack.enterpriseSearch.appSearch.documentCreation.buttons.crawlDescription',
              { defaultMessage: 'Automatically index documents from a URL' }
            )}
            icon={<EuiIcon type="globe" size="xl" color="primary" />}
            to={crawlerLink}
            isDisabled={disabled}
          />
          <EuiSpacer size="m" />
          <EuiCard
            hasBorder
            layout="horizontal"
            title={i18n.translate(
              'xpack.enterpriseSearch.appSearch.documentCreation.buttons.jsonTitle',
              { defaultMessage: 'Paste or upload JSON' }
            )}
            description={i18n.translate(
              'xpack.enterpriseSearch.appSearch.documentCreation.buttons.jsonDescription',
              { defaultMessage: 'Add documents by pasting or uploading raw JSON' }
            )}
            icon={<EuiIcon type="indexEdit" size="xl" color="primary" />}
            data-test-subj="IndexingPasteJSONButton"
            onClick={() => openDocumentCreation('json')}
            isDisabled={disabled}
          />
          <EuiSpacer size="m" />
          <EuiCard
            hasBorder
            layout="horizontal"
            title={i18n.translate(
              'xpack.enterpriseSearch.appSearch.documentCreation.buttons.apiTitle',
              {
                defaultMessage: 'Index from API',
              }
            )}
            description={i18n.translate(
              'xpack.enterpriseSearch.appSearch.documentCreation.buttons.apiDescription',
              { defaultMessage: 'POST to the documents endpoint' }
            )}
            icon={<EuiIcon type="exportAction" size="xl" color="primary" />}
            onClick={() => openDocumentCreation('api')}
            isDisabled={disabled}
          />
        </EuiFlexItem>
        {!isFlyout && emptyState}
      </EuiFlexGroup>
    </>
  );
};
