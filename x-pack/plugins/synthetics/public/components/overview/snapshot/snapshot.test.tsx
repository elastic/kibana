/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { SnapshotComponent } from './snapshot';
import { Snapshot } from '../../../../common/runtime_types/snapshot';
import * as hook from './use_snap_shot';

describe('Snapshot component', () => {
  const snapshot: Snapshot = {
    up: 8,
    down: 2,
    total: 10,
  };

  it('renders without errors', () => {
    jest.spyOn(hook, 'useSnapShotCount').mockReturnValue({ count: snapshot, loading: false });

    const wrapper = shallowWithIntl(<SnapshotComponent />);
    expect(wrapper).toMatchSnapshot();
  });
});
