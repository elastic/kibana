/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiButton, EuiEmptyPrompt, EuiImage, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DOCS_URL } from '../../routes';
import { DocumentCreationButtons, DocumentCreationFlyout } from '../document_creation';
import illustration from '../document_creation/illustration.svg';

import { EngineLogic, getEngineBreadcrumbs } from '../engine';
import { AppSearchPageTemplate } from '../layout';

export const EmptyEngineOverview: React.FC = () => {
  const {
    isElasticsearchEngine,
    engine: { elasticsearchIndexName },
  } = useValues(EngineLogic);

  const elasticsearchEmptyState = (
    <EuiEmptyPrompt
      data-test-subj="ElasticsearchIndexEmptyState"
      icon={
        <EuiImage
          size="fullWidth"
          src={illustration}
          alt={i18n.translate(
            'xpack.enterpriseSearch.appSearch.elasticsearchEngine.emptyStateIllustrationAltText',
            { defaultMessage: 'Illustration' }
          )}
        />
      }
      title={
        <h2>
          {i18n.translate('xpack.enterpriseSearch.appSearch.elasticsearchEngine.emptyStateTitle', {
            defaultMessage: 'Add documents to your index',
          })}
        </h2>
      }
      layout="horizontal"
      hasBorder
      color="plain"
      body={
        <>
          <p>
            {i18n.translate('xpack.enterpriseSearch.appSearch.elasticsearchEngine.helperText', {
              defaultMessage:
                "Your Elasticsearch index, {elasticsearchIndexName}, doesn't have any documents yet. Open Index Management in Kibana to make changes to your Elasticsearch indices.",
              values: { elasticsearchIndexName },
            })}
          </p>
          <EuiSpacer size="m" />
          <EuiButton fill href="/app/management/data/index_management/indices">
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.elasticsearchEngine.emptyStateButton',
              {
                defaultMessage: 'Manage indices',
              }
            )}
          </EuiButton>
        </>
      }
    />
  );

  return (
    <AppSearchPageTemplate
      pageChrome={getEngineBreadcrumbs()}
      pageHeader={{
        pageTitle: i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.overview.empty.heading',
          { defaultMessage: 'Engine setup' }
        ),
        rightSideItems: [
          <EuiButton href={DOCS_URL} target="_blank" iconType="popout">
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.overview.empty.headingAction',
              { defaultMessage: 'View documentation' }
            )}
          </EuiButton>,
        ],
      }}
      data-test-subj="EngineOverview"
    >
      {isElasticsearchEngine ? (
        elasticsearchEmptyState
      ) : (
        <>
          <DocumentCreationButtons />
          <DocumentCreationFlyout />
        </>
      )}
    </AppSearchPageTemplate>
  );
};
