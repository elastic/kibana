/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import transformListRow from '../../../../common/__mocks__/transform_list_row.json';

import { ExpandedRowJsonPane } from './expanded_row_json_pane';

describe('Transform: Transform List Expanded Row <ExpandedRowJsonPane />', () => {
  test('Minimal initialization', () => {
    const { container } = render(<ExpandedRowJsonPane json={transformListRow.config} />);
    expect(container.textContent).toContain(JSON.stringify(transformListRow.config, null, 2));
  });
});
