/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderWithIntl } from 'test_utils/enzyme_helpers';

import { RemoteClusterForm } from './remote_cluster_form';

jest.mock('@elastic/eui', () => {
  const eui = require.requireActual('@elastic/eui');
  return {
    ...eui,
    // Prevent non-deterministic aria IDs from breaking snapshots on each run.
    EuiDescribedFormGroup: ({ description, children }) => (
      <div>
        <div>{description}</div>
        <div>{children}</div>
      </div>
    ),
    // Prevent non-deterministic aria IDs from breaking snapshots on each run.
    EuiFormRow: ({ label, helpText, children }) => (
      <div>
        <div>{label}</div>
        <div>{children}</div>
        <div>{helpText}</div>
      </div>
    ),
    // Prevent non-deterministic aria IDs from breaking snapshots on each run.
    EuiSwitch: ({ labeln }) => (
      <div>{labeln}</div>
    ),
  };
});

describe('RemoteClusterForm', () => {
  test(`renders untouched state`, () => {
    const component = renderWithIntl(
      <RemoteClusterForm
        save={() => {}}
        cancel={() => {}}
        isSaving={false}
        saveError={undefined}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
