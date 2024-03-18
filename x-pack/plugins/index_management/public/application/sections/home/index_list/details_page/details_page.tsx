/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState, FunctionComponent } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPageTemplate, EuiText, EuiCode } from '@elastic/eui';
import { SectionLoading } from '@kbn/es-ui-shared-plugin/public';

import { resetIndexUrlParams } from './reset_index_url_params';
import {
  IndexDetailsSection,
  IndexDetailsTabId,
  Section,
} from '../../../../../../common/constants';
import { Index } from '../../../../../../common';
import { Error } from '../../../../../shared_imports';
import { loadIndex } from '../../../../services';
import { DetailsPageError } from './details_page_error';
import { DetailsPageContent } from './details_page_content';

export const DetailsPage: FunctionComponent<
  RouteComponentProps<{ indexName: string; indexDetailsSection: IndexDetailsSection }>
> = ({ location: { search }, history }) => {
  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const indexName = queryParams.get('indexName') ?? '';
  const tab: IndexDetailsTabId = queryParams.get('tab') ?? IndexDetailsSection.Overview;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [index, setIndex] = useState<Index | null>();

  const navigateToIndicesList = useCallback(() => {
    const paramsString = resetIndexUrlParams(search);
    history.push(`/${Section.Indices}${paramsString ? '?' : ''}${paramsString}`);
  }, [history, search]);

  const fetchIndexDetails = useCallback(async () => {
    if (indexName) {
      setIsLoading(true);
      try {
        const { data, error: loadingError } = await loadIndex(indexName);
        setIsLoading(false);
        setError(loadingError);
        setIndex(data);
      } catch (e) {
        setIsLoading(false);
        setError(e);
      }
    }
  }, [indexName]);

  useEffect(() => {
    fetchIndexDetails();
  }, [fetchIndexDetails]);

  if (!indexName) {
    return (
      <EuiPageTemplate.EmptyPrompt
        data-test-subj="indexDetailsNoIndexNameError"
        color="danger"
        iconType="warning"
        title={
          <h2>
            <FormattedMessage
              id="xpack.idxMgmt.indexDetails.noIndexNameErrorTitle"
              defaultMessage="Unable to load index details"
            />
          </h2>
        }
        body={
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.idxMgmt.indexDetails.noIndexNameErrorDescription"
              defaultMessage="An index name is required for this page. Add a query parameter {queryParam} followed by an index name to the url."
              values={{
                queryParam: <EuiCode>indexName</EuiCode>,
              }}
            />
          </EuiText>
        }
      />
    );
  }
  if (isLoading && !index) {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.idxMgmt.indexDetails.loadingDescription"
          defaultMessage="Loading index details…"
        />
      </SectionLoading>
    );
  }
  if (error || !index) {
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
