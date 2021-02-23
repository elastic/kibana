/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/jsx-no-bind */

/* eslint-disable react-perf/jsx-no-new-function-as-prop */

import { find } from 'lodash/fp';
import { produce } from 'immer';
import { EuiText, EuiSuperSelect } from '@elastic/eui';
import React from 'react';
import { useQuery } from 'react-query';

import { useKibana } from '../../common/lib/kibana';

// @ts-expect-error update types
export const ScheduledQueryPackSelector = ({ data, handleChange }) => {
  const { http } = useKibana().services;
  const {
    data: { saved_objects: packs } = {
      saved_objects: [],
    },
  } = useQuery('packs', () => http.get('/internal/osquery/pack'));

  // @ts-expect-error update types
  const handlePackChange = (value) => {
    const newPack = find(['id', value], packs);

    // @ts-expect-error update types
    const updatedPolicy = produce(data, (draft) => {
      draft.inputs[0].config.pack = {
        type: 'text',
        value: newPack.id,
      };
      // @ts-expect-error update types
      draft.inputs[0].streams = newPack.queries.map((packQuery) => ({
        data_stream: {
          type: 'logs',
          dataset: 'osquery_elastic_managed.osquery',
        },
        vars: {
          query: {
            type: 'text',
            value: packQuery.query,
          },
          interval: {
            type: 'text',
            value: `${packQuery.interval}`,
          },
          id: {
            type: 'text',
            value: packQuery.id,
          },
        },
        enabled: true,
      }));
    });

    handleChange({
      isValid: true,
      updatedPolicy,
    });
  };

  return (
    <EuiSuperSelect
      // @ts-expect-error update types
      options={packs.map((pack) => ({
        value: pack.id,
        inputDisplay: (
          <>
            <EuiText>{pack.name}</EuiText>
            <EuiText size="s" color="subdued">
              <p className="euiTextColor--subdued">{pack.description}</p>
            </EuiText>
          </>
        ),
      }))}
      valueOfSelected={data.inputs[0].config}
      onChange={handlePackChange}
    />
  );
};
