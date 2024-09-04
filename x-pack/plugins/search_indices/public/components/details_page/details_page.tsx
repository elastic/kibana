/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageSection, EuiSpacer, EuiButton, EuiPageTemplate } from '@elastic/eui';
import React, { useMemo } from 'react';
import { FunctionComponent } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { useIndex } from '../../hooks/api/use_index';
import { i18n } from '@kbn/i18n';

export const SearchIndexDetailsPage: FunctionComponent<
  RouteComponentProps<{ indexName: string }>
> = ({ location: { search } }) => {
  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const indexName = queryParams.get('indexName') ?? '';

  const { data: index } = useIndex(indexName);

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
          onClick={() => {}}
        >
          <FormattedMessage
            id="xpack.idxMgmt.searchIndexDetails.backToIndicesButtonLabel"
            defaultMessage="Back to indices"
          />
        </EuiButton>
      </EuiPageSection>
      <EuiSpacer size="l" />
      <EuiPageTemplate.Header
        data-test-subj="searchIndexDetailsHeader"
        pageTitle={
          <FormattedMessage
            id="xpack.searchIndices.detailsPage.title"
            defaultMessage="{indexName}"
            values={{
              indexName: index?.name,
            }}
          />
        }
        rightSideItems={[]}
      />
      <EuiSpacer size="l" />

      <div data-test-subj="searchIndexDetailsContent" />
    </EuiPageTemplate>
  );
};
