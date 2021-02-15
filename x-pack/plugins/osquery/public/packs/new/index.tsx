/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useMutation } from 'react-query';
import { useHistory } from 'react-router-dom';

import { PackForm } from '../common/pack_form';
import { useKibana } from '../../common/lib/kibana';

const NewPackPageComponent = () => {
  const history = useHistory();
  const { http } = useKibana().services;

  const addPackMutation = useMutation(
    (payload) =>
      http.post(`/internal/osquery/pack`, {
        body: JSON.stringify({
          // @ts-expect-error update types
          ...payload,
          queries: [],
        }),
      }),
    {
      onSuccess: (data) => {
        history.push(`/packs/${data.id}`);
      },
    }
  );

  // @ts-expect-error update types
  return <PackForm handleSubmit={addPackMutation.mutate} />;
};

export const NewPackPage = React.memo(NewPackPageComponent);
