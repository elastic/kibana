/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/** @jsx jsx */

import { useQuery, useMutation } from 'react-query';
import { jsx } from '@emotion/react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { RouteComponentProps } from 'react-router-dom';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { CoreStart } from '../../../../../../src/core/public';
import { BASE_PATH, INTERNAL_TEST_ROUTE } from '../../../common/constants';

const TestPage = (props: RouteComponentProps) => {
  // An example of setting using and setting the core services
  // in the client plugin
  const { chrome, http } = useKibana<CoreStart>().services;
  chrome.setBreadcrumbs([{
    text: props.match.path,
    href: http.basePath.prepend(`${BASE_PATH}${props.match.path.split('/')[1]}`),
  }]);
  chrome.docTitle.change(props.match.path);

  // An example of using useQuery to hit an internal endpoint via fetcg(GET)
  const { isFetching, data: getData } = useQuery(
    'test-data',
    () => http.get(INTERNAL_TEST_ROUTE),
  );

  // An example of using useQuery to hit an internal endpoint via mutation (PUT)
  const { mutate, isLoading, data: putData } = useMutation(() => {
    return http.put(INTERNAL_TEST_ROUTE)
  });

  const handleButtonClick = () => {
    mutate();
  }

  if (isFetching || isLoading) {
    return (
      <div>
        Loading!
      </div>
    )
  }

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        current path: {props.match.path}
      </EuiFlexItem>
      <EuiFlexItem>
        get network data: {getData?.value || 'None'}
      </EuiFlexItem>
      <EuiFlexItem>
        put network data: {putData?.value || 'None'}
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton onClick={handleButtonClick}>
          Fetch data
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  )
};

export default TestPage;
