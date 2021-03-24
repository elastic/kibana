/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useMutation } from 'react-query';
import { useLocation } from 'react-router-dom';

import { useKibana } from '../common/lib/kibana';
import { LiveQueryForm } from './form';
import { ResultTabs } from '../queries/edit/tabs';

const LiveQueryComponent = () => {
  const location = useLocation();
  const { http } = useKibana().services;

  const createActionMutation = useMutation((payload: Record<string, unknown>) =>
    http.post('/internal/osquery/action', {
      body: JSON.stringify(payload),
    })
  );

  return (
    <>
      {
        <LiveQueryForm
          defaultValue={location.state?.query}
          // @ts-expect-error update types
          onSubmit={createActionMutation.mutate}
        />
      }

      {createActionMutation.data && (
        <>
          <EuiSpacer />
          <ResultTabs actionId={createActionMutation.data?.action.action_id} />
        </>
      )}
    </>
  );
};

export const LiveQuery = React.memo(LiveQueryComponent);
