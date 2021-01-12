/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test/jest';
import { Snapshot } from '../../../common/runtime_types';
import { SnapshotComponent } from './snapshot/snapshot';

describe('Snapshot component', () => {
  const snapshot: Snapshot = {
    up: 8,
    down: 2,
    total: 10,
  };

  it('renders without errors', () => {
    const wrapper = shallowWithIntl(<SnapshotComponent count={snapshot} loading={false} />);
    expect(wrapper).toMatchSnapshot();
  });
});
