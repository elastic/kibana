/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, FunctionComponent } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { IndexDetailsSection, IndexDetailsTabId } from '../../../../../../common/constants';
import { DetailsPageError } from './details_page_errors/details_page_error';
import { DetailsPageContent } from './details_page_content';
import { DetailsPageLoading } from './details_page_index_loading';
import { DetailsPageEmptyIndexNameError } from './details_page_errors/error_empty_index_name';
import { useIndexFunctions } from '../../../../hooks/use_index_functions';

export const DetailsPage: FunctionComponent<
  RouteComponentProps<{ indexName: string; indexDetailsSection: IndexDetailsSection }>
> = ({ location: { search }, history }) => {
  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const indexName = queryParams.get('indexName') ?? '';
  const tab: IndexDetailsTabId = queryParams.get('tab') ?? IndexDetailsSection.Overview;

  const { isIndicesLoading, indexLoadingError, index, fetchIndexDetails, navigateToIndicesList } =
    useIndexFunctions(indexName, search, history);

  useEffect(() => {
    fetchIndexDetails();
  }, [fetchIndexDetails]);

  if (!indexName) {
    return <DetailsPageEmptyIndexNameError />;
  }
  if (isIndicesLoading && !index) {
    return <DetailsPageLoading />;
  }
  if (indexLoadingError || !index) {
    return (
      <DetailsPageError
        indexName={indexName}
        resendRequest={fetchIndexDetails}
        navigateToIndicesList={navigateToIndicesList}
      />
    );
  }
  return (
    <DetailsPageContent
      index={index}
      tab={tab}
      fetchIndexDetails={fetchIndexDetails}
      history={history}
      search={search}
      navigateToIndicesList={navigateToIndicesList}
    />
  );
};
