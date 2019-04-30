/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { Snapshot as SnapshotType } from '../../../../common/graphql/types';
import { SnapshotComponent } from '../snapshot';

describe('Snapshot component', () => {
  const snapshot: SnapshotType = {
    up: 8,
    down: 2,
    total: 10,
    histogram: [
      { upCount: 7, downCount: 3, x: 1548697920000, x0: 1548697620000, y: 1 },
      { upCount: 7, downCount: 3, x: 1548698220000, x0: 1548697920000, y: 1 },
      { upCount: 7, downCount: 3, x: 1548698520000, x0: 1548698220000, y: 1 },
      { upCount: 7, downCount: 3, x: 1548698820000, x0: 1548698520000, y: 1 },
      { upCount: 8, downCount: 2, x: 1548699120000, x0: 1548698820000, y: 1 },
      { upCount: 8, downCount: 2, x: 1548699420000, x0: 1548699120000, y: 1 },
      { upCount: 8, downCount: 2, x: 1548699720000, x0: 1548699420000, y: 1 },
      { upCount: 8, downCount: 2, x: 1548700020000, x0: 1548699720000, y: 1 },
      { upCount: 8, downCount: 2, x: 1548700320000, x0: 1548700020000, y: 1 },
      { upCount: 8, downCount: 2, x: 1548700620000, x0: 1548700320000, y: 1 },
      { upCount: 8, downCount: 2, x: 1548700920000, x0: 1548700620000, y: 1 },
    ],
  };

  it('renders without errors', () => {
    const wrapper = shallowWithIntl(
      <SnapshotComponent
        colors={{ danger: '#F050F0', mean: '#001100', range: '#FF00FF', success: '#000000' }}
        data={{ snapshot }}
        loading={false}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
