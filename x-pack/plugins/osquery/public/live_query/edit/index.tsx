/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import { EuiCodeBlock, EuiSpacer } from '@elastic/eui';
import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
// import { useQuery } from 'react-query';

import { ResultTabs } from './tabs';
import { LiveQueryForm } from '../form';
// import { useKibana } from '../../common/lib/kibana';
import { useActionDetails } from '../../actions/use_action_details';

const EditLiveQueryPageComponent = () => {
  // const { http } = useKibana().services;
  const { actionId } = useParams<{ actionId: string }>();

  const { isLoading, data: actionDetails } = useActionDetails({ actionId });

  // const { isLoading, data: actionDetails } = useQuery(['savedQuery', { savedQueryId }], () =>
  //   http.get(`/api/osquery/saved_query/${savedQueryId}`)
  // );

  const handleSubmit = useCallback(() => Promise.resolve(), []);

  if (isLoading) {
    return <>{'Loading...'}</>;
  }

  console.error('actionDetails', actionDetails);

  return (
    <>
      <EuiCodeBlock language="sql" fontSize="m" paddingSize="m">
        {actionDetails?.actionDetails?._source?.data.commands[0].query}
      </EuiCodeBlock>
      <EuiSpacer />
      {/* <ResultTabs /> */}
    </>
  );
};

export const EditLiveQueryPage = React.memo(EditLiveQueryPageComponent);
