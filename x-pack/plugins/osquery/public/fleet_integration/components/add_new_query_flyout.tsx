/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/jsx-no-bind */

/* eslint-disable react-perf/jsx-no-new-function-as-prop */

import { produce } from 'immer';
import { EuiFlyout, EuiTitle, EuiFlyoutBody, EuiFlyoutHeader, EuiPortal } from '@elastic/eui';
import React from 'react';

import { AddPackQueryForm } from '../../packs/common/add_pack_query';

// @ts-expect-error update types
export const AddNewQueryFlyout = ({ data, handleChange, onClose }) => {
  // @ts-expect-error update types
  const handleSubmit = (payload) => {
    // @ts-expect-error update types
    const updatedPolicy = produce(data, (draft) => {
      draft.inputs[0].streams.push({
        data_stream: {
          type: 'logs',
          dataset: 'osquery_elastic_managed.osquery',
        },
        vars: {
          query: {
            type: 'text',
            value: payload.query.attributes.query,
          },
          interval: {
            type: 'text',
            value: `${payload.interval}`,
          },
          id: {
            type: 'text',
            value: payload.query.id,
          },
        },
        enabled: true,
      });
    });

    onClose();
    handleChange({
      isValid: true,
      updatedPolicy,
    });
  };

  return (
    <EuiPortal>
      <EuiFlyout ownFocus onClose={onClose} aria-labelledby="flyoutTitle">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2 id="flyoutTitle">Attach next query</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <AddPackQueryForm handleSubmit={handleSubmit} />
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
};
