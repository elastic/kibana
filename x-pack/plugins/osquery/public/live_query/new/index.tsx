/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';

import { useKibana } from '../../common/lib/kibana';
import { LiveQueryForm } from '../form';

const NewLiveQueryPageComponent = () => {
  const { http } = useKibana().services;

  const handleSubmit = useCallback(
    async (props) => {
      console.error('submit', props);
      const response = await http.post('/api/osquery/queries', props);
      console.error('handleSubmit response', response);
      // console.error('htt', http);
      // http.post({});
    },
    [http]
  );

  return (
    <>
      <LiveQueryForm onSubmit={handleSubmit} />
    </>
  );
};

export const NewLiveQueryPage = React.memo(NewLiveQueryPageComponent);
