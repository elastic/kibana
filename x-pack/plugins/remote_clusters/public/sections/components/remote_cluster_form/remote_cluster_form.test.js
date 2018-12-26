/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderWithIntl } from 'test_utils/enzyme_helpers';

import { RemoteClusterForm } from './remote_cluster_form';

/**
 * Make sure we have deterministic aria ID
 */
jest.mock('@elastic/eui/lib/components/form/form_row/make_id', () => () => 'my-id');

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
