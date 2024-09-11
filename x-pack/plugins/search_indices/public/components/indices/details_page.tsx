/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPageSection,
  EuiSpacer,
  EuiButton,
  EuiPageTemplate,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { useIndex } from '../../hooks/api/use_index';
import { useKibana } from '../../hooks/use_kibana';
import { ConnectionDetails } from '../connection_details/connection_details';
import { QuickStats } from '../quick_stats/quick_stats';
import { useIndexMapping } from '../../hooks/api/use_index_mappings';

export const SearchIndexDetailsPage = () => {
  const indexName = decodeURIComponent(useParams<{ indexName: string }>().indexName);
  const { console: consolePlugin, application } = useKibana().services;

  const { data: index, isInitialLoading: isIndexInitialLoading } = useIndex(indexName);
  const { data: mappings, isInitialLoading: isMappingsInitialLoading } = useIndexMapping(indexName);
  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );
  const navigateToIndexListPage = useCallback(() => {
    application.navigateToApp('management', { deepLinkId: 'index_management' });
  }, [application]);

  if (isIndexInitialLoading || isMappingsInitialLoading) {
    return null;
  }

  return (
    <EuiPageTemplate
      offset={0}
      restrictWidth={false}
      data-test-subj="searchIndicesDetailsPage"
      grow={false}
      panelled
      bottomBorder
    >
      <EuiPageSection>
        <EuiButton
          data-test-subj="searchIndexDetailsBackToIndicesButton"
          color="text"
          iconType="arrowLeft"
          onClick={navigateToIndexListPage}
        >
          <FormattedMessage
            id="xpack.searchIndices.backToIndicesButtonLabel"
            defaultMessage="Back to indices"
          />
        </EuiButton>
      </EuiPageSection>
      <EuiPageTemplate.Header
        data-test-subj="searchIndexDetailsHeader"
        pageTitle={index?.name}
        rightSideItems={[]}
      />
      <div data-test-subj="searchIndexDetailsContent" />
      <EuiPageTemplate.Section grow={false}>
        <EuiFlexGroup>
          <EuiFlexItem>
            <ConnectionDetails />
          </EuiFlexItem>
          <EuiFlexItem>{/* TODO: API KEY */}</EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        <EuiFlexGroup>
          <QuickStats index={index} mappings={mappings} />
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
      {embeddableConsole}
    </EuiPageTemplate>
  );
};
