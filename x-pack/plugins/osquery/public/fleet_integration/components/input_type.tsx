/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react-perf/jsx-no-new-object-as-prop */

/* eslint-disable react-perf/jsx-no-new-array-as-prop */

import React, { useCallback } from 'react';
import produce from 'immer';
import { EuiRadioGroup } from '@elastic/eui';

// @ts-expect-error update types
export const ScheduledQueryInputType = ({ data, handleChange }) => {
  const radios = [
    {
      id: 'pack',
      label: 'Pack',
    },
    {
      id: 'saved_queries',
      label: 'Saved queries',
    },
  ];

  const onChange = useCallback(
    (optionId: string) => {
      // @ts-expect-error update types
      const updatedPolicy = produce(data, (draft) => {
        if (!draft.inputs[0].config) {
          draft.inputs[0].config = {
            input_source: {
              type: 'text',
              value: optionId,
            },
          };
        } else {
          draft.inputs[0].config.input_source.value = optionId;
        }
      });

      handleChange({
        isValid: true,
        updatedPolicy,
      });
    },
    [data, handleChange]
  );

  return (
    <EuiRadioGroup
      options={radios}
      idSelected={data.inputs[0].config?.input_source?.value ?? 'saved_queries'}
      onChange={onChange}
      name="radio group"
      legend={{
        children: <span>{'Choose input type'}</span>,
      }}
    />
  );
};
