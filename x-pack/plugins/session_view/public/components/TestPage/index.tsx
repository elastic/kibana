/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/** @jsx jsx */

import { useState } from 'react';
import { useQuery, useMutation } from 'react-query';
import { jsx } from '@emotion/react';
import {
  EuiButton,
  EuiFieldText,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageContent,
  EuiTitle,
} from '@elastic/eui';
import { RouteComponentProps } from 'react-router-dom';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { CoreStart } from '../../../../../../src/core/public';
import {
  BASE_PATH,
  INTERNAL_TEST_ROUTE,
  INTERNAL_TEST_SAVED_OBJECT_ROUTE,
} from '../../../common/constants';
import { SessionView } from '../SessionView';

const testSessionId = '4321';

export const TestPage = (props: RouteComponentProps) => {
  // An example of setting using and setting the core services
  // in the client plugin
  const { chrome, http } = useKibana<CoreStart>().services;
  chrome.setBreadcrumbs([
    {
      text: props.match.path,
      href: http.basePath.prepend(`${BASE_PATH}${props.match.path.split('/')[1]}`),
    },
  ]);
  chrome.docTitle.change(props.match.path);

  const [indexName, setIndexName] = useState('test');
  const [searchIndex, setSearchIndex] = useState(indexName);

  // An example of using useQuery to hit an internal endpoint via fetch (GET)
  const {
    isFetching,
    data: getData,
    refetch,
  } = useQuery(['test-data', searchIndex], () =>
    http.get(INTERNAL_TEST_ROUTE, {
      query: {
        index: indexName,
      },
    })
  );

  // An example of using useQuery to hit an internal endpoint via mutation (PUT)
  const {
    mutate,
    isLoading,
    data: putData,
  } = useMutation(() => {
    return http.put(INTERNAL_TEST_ROUTE, { body: JSON.stringify({ index: indexName }) });
  });

  const handleInsertData = () => {
    mutate();
  };
  const handleFetchData = () => {
    setSearchIndex(indexName);
  };
  const handleRefetch = () => {
    refetch();
  };

  // An example of using useQuery to hit an internal endpoint via fetch (GET)
  const {
    isFetching: SOisFetching,
    data: SOgetData,
    refetch: SOrefetch,
  } = useQuery(['test-saved-object-data'], () => http.get(INTERNAL_TEST_SAVED_OBJECT_ROUTE));

  const {
    mutate: SOmutate,
    isLoading: SOisLoading,
    data: SOputData,
  } = useMutation(() => {
    return http.put(INTERNAL_TEST_SAVED_OBJECT_ROUTE, {
      body: JSON.stringify({ index: indexName }),
    });
  });

  const handleSavedObjectsInsertData = () => {
    SOmutate();
  };

  const handleSavedObjectsRefetch = () => {
    SOrefetch();
  };

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIndexName(e.target.value);
  };

  return (
    <EuiPage>
      <EuiPageContent data-test-subj="sessionViewTestPage">
        <EuiFlexGroup direction="column">
          SessionView component rendered using mock data.
          <br />
          <br />
          <br />
          <SessionView sessionId={testSessionId} />
          <br />
          <br />
          <br />
          <EuiFlexGrid columns={2}>
            <EuiFlexItem>
              <EuiTitle>
                <h3>ElasticSearch Client</h3>
              </EuiTitle>
              <EuiFlexItem>current path: {props.match.path}</EuiFlexItem>
              <EuiFlexItem>
                Index Name:
                <EuiFieldText value={indexName} onChange={handleOnChange} />
              </EuiFlexItem>
              <EuiFlexGrid columns={3}>
                <EuiFlexItem>
                  <EuiButton onClick={handleInsertData}>Put Data</EuiButton>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButton onClick={handleFetchData}>Fetch Data</EuiButton>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButton onClick={handleRefetch}>Refetch Data</EuiButton>
                </EuiFlexItem>
              </EuiFlexGrid>
              <div>
                put network data:
                {isLoading ? <div>Loading!</div> : <pre>{JSON.stringify(putData, null, 2)}</pre>}
              </div>
              <div>
                get network data:
                {isFetching ? <div>Loading!</div> : <pre>{JSON.stringify(getData, null, 2)}</pre>}
              </div>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle>
                <h3>Saved Objects</h3>
              </EuiTitle>
              <EuiFlexGrid columns={3}>
                <EuiFlexItem>
                  <EuiButton onClick={handleSavedObjectsInsertData}>Put Data</EuiButton>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButton onClick={handleSavedObjectsRefetch}>Refetch Data</EuiButton>
                </EuiFlexItem>
              </EuiFlexGrid>
              <div>
                put network data:
                {SOisLoading ? (
                  <div>Loading!</div>
                ) : (
                  <pre>{JSON.stringify(SOputData, null, 2)}</pre>
                )}
              </div>
              <div>
                get network data:
                {SOisFetching ? (
                  <div>Loading!</div>
                ) : (
                  <pre>{JSON.stringify(SOgetData, null, 2)}</pre>
                )}
              </div>
            </EuiFlexItem>
          </EuiFlexGrid>
        </EuiFlexGroup>
      </EuiPageContent>
    </EuiPage>
  );
};
