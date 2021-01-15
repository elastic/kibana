/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { useHistory } from 'react-router-dom';

import { useKibana } from '../../common/lib/kibana';
import { LiveQueryForm } from '../form';

const NewLiveQueryPageComponent = () => {
  const { http } = useKibana().services;
  const history = useHistory();

  console.error('history', history);

  const handleSubmit = useCallback(
    async (props) => {
      console.error('submit', props);
      const response = await http.post('/api/osquery/queries', { body: JSON.stringify(props) });
      console.error('handleSubmit response', response);
      // console.error('htt', http);
      const resquestParamsActionId = JSON.parse(response.meta.request.params.body).action_id;
      history.push(`/live_query/queries/${resquestParamsActionId}`);
    },
    [history, http]
  );

  return (
    <>
      <LiveQueryForm onSubmit={handleSubmit} />
    </>
  );
};

export const NewLiveQueryPage = React.memo(NewLiveQueryPageComponent);
