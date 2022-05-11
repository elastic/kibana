/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useValues, useActions } from 'kea';

import { EuiButton, EuiSpacer, EuiFlexGrid, EuiFlexItem, EuiPagination } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { getEngineBreadcrumbs } from '../engine';
import { AppSearchPageTemplate } from '../layout';

import { SynonymCard, SynonymModal, EmptyState } from './components';
import { SYNONYMS_TITLE } from './constants';

import { SynonymsLogic } from '.';

export const Synonyms: React.FC = () => {
  const { loadSynonyms, onPaginate, openModal } = useActions(SynonymsLogic);
  const { synonymSets, meta, dataLoading } = useValues(SynonymsLogic);
  const hasSynonyms = synonymSets.length > 0;

  useEffect(() => {
    loadSynonyms();
  }, [meta.page.current]);

  useEffect(() => {
    // If users delete the only synonym set on the page, send them back to the previous page
    if (!hasSynonyms && meta.page.current !== 1) {
      onPaginate(meta.page.current - 1);
    }
  }, [synonymSets]);

  return (
    <AppSearchPageTemplate
      pageChrome={getEngineBreadcrumbs([SYNONYMS_TITLE])}
      pageHeader={{
        pageTitle: SYNONYMS_TITLE,
        description: i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.synonyms.description',
          {
            defaultMessage:
              'Use synonyms to relate queries together that contextually have the same meaning in your dataset.',
          }
        ),
        rightSideItems: [
          <EuiButton fill iconType="plusInCircle" onClick={() => openModal(null)}>
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.synonyms.createSynonymSetButtonLabel',
              { defaultMessage: 'Create a synonym set' }
            )}
          </EuiButton>,
        ],
      }}
      isLoading={dataLoading && !hasSynonyms}
      isEmptyState={!hasSynonyms}
      emptyState={<EmptyState />}
    >
      <EuiFlexGrid columns={3}>
        {synonymSets.map(({ id, synonyms }) => (
          <EuiFlexItem key={id}>
            <SynonymCard id={id} synonyms={synonyms} />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
      <EuiSpacer />
      <EuiPagination
        pageCount={meta.page.total_pages}
        activePage={meta.page.current - 1}
        onPageClick={(pageIndex) => onPaginate(pageIndex + 1)}
      />
      <SynonymModal />
    </AppSearchPageTemplate>
  );
};
