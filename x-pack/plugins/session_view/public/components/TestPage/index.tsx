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
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageContent,
  EuiPageHeader,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';
import { RouteComponentProps } from 'react-router-dom';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { CoreStart } from '../../../../../../src/core/public';
import {
  BASE_PATH,
  INTERNAL_TEST_ROUTE,
  INTERNAL_TEST_SAVED_OBJECT_ROUTE,
} from '../../../common/constants';

export const TestPage = (props: RouteComponentProps) => {
  // An example of setting using and setting the core services
  // in the client plugin
  const { chrome, http, notifications } = useKibana<CoreStart>().services;
  chrome.setBreadcrumbs([
    {
      text: 'Home',
      href: http.basePath.prepend(`${BASE_PATH}${props.match.path.split('/')[1]}`),
    },
  ]);
  chrome.docTitle.change('Session View Plugin');

  const [indexName, setIndexName] = useState('test');
  const [message, setMessage] = useState('');
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
  } = useMutation(
    () => {
      return http.put(INTERNAL_TEST_ROUTE, {
        body: JSON.stringify({
          index: indexName,
          data: JSON.stringify([{ message }]),
        }),
      });
    },
    {
      onSuccess: () => {
        notifications.toasts.addSuccess('Data Added!');
      },
    }
  );

  // An example of using useQuery to hit an internal endpoint via mutation (PUT)
  const { mutate: deleteMutate } = useMutation(
    () => {
      return http.delete(INTERNAL_TEST_ROUTE, {
        body: JSON.stringify({
          index: indexName,
        }),
      });
    },
    {
      onSuccess: () => {
        notifications.toasts.addSuccess('Data Deleted!');
      },
    }
  );

  const handleInsertData = () => {
    mutate();
  };
  const handleFetchData = () => {
    setSearchIndex(indexName);
  };
  const handleRefetch = () => {
    refetch();
  };
  const handleDelete = () => {
    deleteMutate();
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

  const handleOnIndexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIndexName(e.target.value);
  };

  const handleOnMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  return (
    <EuiPage>
      <EuiPageContent data-test-subj="sessionViewTestPage">
        <EuiPageHeader
          pageTitle="Plugin POC"
          iconType="logoKibana"
          description={`Below is a POC of a Kibana plugin, demonstrating data fetching patterns and data rendering.
            Please start by adding some mock data
          `}
        />
        <EuiSpacer />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle>
              <h3>ElasticSearch Client</h3>
            </EuiTitle>
            <EuiSpacer />
            <EuiFlexItem>
              Index Name:
              <EuiFieldText value={indexName} onChange={handleOnIndexChange} />
            </EuiFlexItem>
            <EuiSpacer />
            <EuiFlexItem>
              Message:
              <EuiFieldText value={message} onChange={handleOnMessageChange} />
            </EuiFlexItem>
            <EuiSpacer />
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiButton onClick={handleInsertData}>Put Data</EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton onClick={handleFetchData}>Fetch Data</EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton onClick={handleRefetch}>Refetch Data</EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton onClick={handleDelete}>Delete Data</EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer />
            <div>
              put network data:
              <EuiSpacer />
              {isLoading ? <div>Loading!</div> : <pre>{JSON.stringify(putData, null, 2)}</pre>}
            </div>
            <div>
              get network data:
              <EuiSpacer />
              {isFetching ? <div>Loading!</div> : <pre>{JSON.stringify(getData, null, 2)}</pre>}
            </div>
            <EuiSpacer />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle>
              <h3>Saved Objects</h3>
            </EuiTitle>
            <EuiSpacer />
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiButton onClick={handleSavedObjectsInsertData}>Put Data</EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButton onClick={handleSavedObjectsRefetch}>Refetch Data</EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer />
            <div>
              put network data:
              <EuiSpacer />
              {SOisLoading ? <div>Loading!</div> : <pre>{JSON.stringify(SOputData, null, 2)}</pre>}
            </div>
            <div>
              get network data:
              <EuiSpacer />
              {SOisFetching ? <div>Loading!</div> : <pre>{JSON.stringify(SOgetData, null, 2)}</pre>}
            </div>
            <EuiSpacer />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageContent>
    </EuiPage>
  );
};
