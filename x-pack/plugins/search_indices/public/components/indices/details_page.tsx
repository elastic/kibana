/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageSection, EuiSpacer, EuiButton, EuiPageTemplate } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { useIndex } from '../../hooks/api/use_index';
import { useKibana } from '../../hooks/use_kibana';

export const SearchIndexDetailsPage = () => {
  const indexName = decodeURIComponent(useParams<{ indexName: string }>().indexName);
  const { console: consolePlugin, application } = useKibana().services;

  const { data: index } = useIndex(indexName);
  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );
  const navigateToIndexListPage = useCallback(() => {
    application.navigateToApp('management', { deepLinkId: 'index_management' });
  }, [application]);
  return (
    <EuiPageTemplate
      offset={0}
      restrictWidth={false}
      data-test-subj="searchIndicesDetailsPage"
      grow={false}
      bottomBorder={false}
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
      <EuiSpacer size="l" />

      <div data-test-subj="searchIndexDetailsContent" />
      {embeddableConsole}
    </EuiPageTemplate>
  );
};
