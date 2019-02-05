/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { Snapshot } from '../snapshot';

describe('Snapshot component', () => {
  const data = {
    snapshot: {
      up: 3,
      down: 1,
      total: 4,
      histogram: [
        {
          monitorId: 'http@http://localhost:12349/',
          data: [
            { upCount: 54, downCount: null, x: 1547849220000, x0: 1547848920000, y: 1 },
            { upCount: 54, downCount: 6, x: 1547849520000, x0: 1547849220000, y: 1 },
            { upCount: 60, downCount: null, x: 1547849820000, x0: 1547849520000, y: 1 },
            { upCount: 60, downCount: null, x: 1547850120000, x0: 1547849820000, y: 1 },
            { upCount: 60, downCount: null, x: 1547850420000, x0: 1547850120000, y: 1 },
            { upCount: 60, downCount: null, x: 1547850720000, x0: 1547850420000, y: 1 },
            { upCount: 60, downCount: null, x: 1547851020000, x0: 1547850720000, y: 1 },
            { upCount: 60, downCount: null, x: 1547851320000, x0: 1547851020000, y: 1 },
            { upCount: 5, downCount: null, x: 1547851620000, x0: 1547851320000, y: 1 },
            { upCount: 26, downCount: null, x: 1547852820000, x0: 1547852520000, y: 1 },
          ],
        },
        {
          monitorId: 'http@http://www.example.com',
          data: [
            { upCount: null, downCount: 54, x: 1547849220000, x0: 1547848920000, y: 1 },
            { upCount: null, downCount: 60, x: 1547849520000, x0: 1547849220000, y: 1 },
            { upCount: null, downCount: 60, x: 1547849820000, x0: 1547849520000, y: 1 },
            { upCount: null, downCount: 60, x: 1547850120000, x0: 1547849820000, y: 1 },
            { upCount: null, downCount: 60, x: 1547850420000, x0: 1547850120000, y: 1 },
            { upCount: null, downCount: 60, x: 1547850720000, x0: 1547850420000, y: 1 },
            { upCount: null, downCount: 60, x: 1547851020000, x0: 1547850720000, y: 1 },
            { upCount: null, downCount: 60, x: 1547851320000, x0: 1547851020000, y: 1 },
            { upCount: null, downCount: 5, x: 1547851620000, x0: 1547851320000, y: 1 },
            { upCount: null, downCount: 4, x: 1547852820000, x0: 1547852520000, y: 1 },
          ],
        },
        {
          monitorId: 'http@https://www.google.com/',
          data: [
            { upCount: 54, downCount: null, x: 1547849220000, x0: 1547848920000, y: 1 },
            { upCount: 60, downCount: null, x: 1547849520000, x0: 1547849220000, y: 1 },
            { upCount: 60, downCount: null, x: 1547849820000, x0: 1547849520000, y: 1 },
            { upCount: 60, downCount: null, x: 1547850120000, x0: 1547849820000, y: 1 },
            { upCount: 60, downCount: null, x: 1547850420000, x0: 1547850120000, y: 1 },
            { upCount: 60, downCount: null, x: 1547850720000, x0: 1547850420000, y: 1 },
            { upCount: 60, downCount: null, x: 1547851020000, x0: 1547850720000, y: 1 },
            { upCount: 60, downCount: null, x: 1547851320000, x0: 1547851020000, y: 1 },
            { upCount: 5, downCount: null, x: 1547851620000, x0: 1547851320000, y: 1 },
            { upCount: 7, downCount: 1, x: 1547852820000, x0: 1547852520000, y: 1 },
          ],
        },
        {
          monitorId: 'http@https://www.wikipedia.org/',
          data: [
            { upCount: 4, downCount: null, x: 1547849220000, x0: 1547848920000, y: 1 },
            { upCount: 5, downCount: null, x: 1547849520000, x0: 1547849220000, y: 1 },
            { upCount: 5, downCount: null, x: 1547849820000, x0: 1547849520000, y: 1 },
            { upCount: 5, downCount: null, x: 1547850120000, x0: 1547849820000, y: 1 },
            { upCount: 5, downCount: null, x: 1547850420000, x0: 1547850120000, y: 1 },
            { upCount: 5, downCount: null, x: 1547850720000, x0: 1547850420000, y: 1 },
            { upCount: 5, downCount: null, x: 1547851020000, x0: 1547850720000, y: 1 },
            { upCount: 5, downCount: null, x: 1547851320000, x0: 1547851020000, y: 1 },
            { upCount: 1, downCount: null, x: 1547852820000, x0: 1547852520000, y: 1 },
          ],
        },
      ],
    },
  };

  it('renders without errors', () => {
    const { snapshot } = data;
    const wrapper = shallowWithIntl(
      <Snapshot danger="#F050F0" primary="#000000" snapshot={snapshot} windowWidth={1600} />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
