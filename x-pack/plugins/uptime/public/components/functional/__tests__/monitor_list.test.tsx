/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { LatestMonitorsResult } from '../../../../common/graphql/types';
import { MonitorList } from '../monitor_list';

describe('MonitorList component', () => {
  let monitorResult: LatestMonitorsResult;

  beforeEach(() => {
    monitorResult = {
      monitors: [
        {
          key: { id: 'http@http://www.example.com', port: 80 },
          ping: {
            timestamp: '2019-01-18T23:02:58.384Z',
            monitor: {
              status: 'down',
              type: 'http',
              host: 'www.example.com',
              ip: '198.71.248.67',
              duration: { us: 2479437 },
            },
          },
          upSeries: [
            { x: 1547848920000, y: null },
            { x: 1547849220000, y: null },
            { x: 1547849520000, y: null },
            { x: 1547849820000, y: null },
            { x: 1547850120000, y: null },
            { x: 1547850420000, y: null },
            { x: 1547850720000, y: null },
            { x: 1547851020000, y: null },
            { x: 1547851320000, y: null },
            { x: 1547851620000, y: null },
            { x: 1547851920000, y: null },
            { x: 1547852220000, y: null },
            { x: 1547852520000, y: null },
          ],
          downSeries: [
            { x: 1547848920000, y: 54 },
            { x: 1547849220000, y: 60 },
            { x: 1547849520000, y: 60 },
            { x: 1547849820000, y: 60 },
            { x: 1547850120000, y: 60 },
            { x: 1547850420000, y: 60 },
            { x: 1547850720000, y: 60 },
            { x: 1547851020000, y: 60 },
            { x: 1547851320000, y: 5 },
            { x: 1547851620000, y: null },
            { x: 1547851920000, y: null },
            { x: 1547852220000, y: null },
            { x: 1547852520000, y: 4 },
          ],
        },
        {
          key: { id: 'http@https://www.elastic.co', port: 443 },
          ping: {
            timestamp: '2019-01-18T22:42:22.385Z',
            monitor: {
              status: 'up',
              type: 'http',
              host: 'www.elastic.co',
              ip: '151.101.210.217',
              duration: { us: 392993 },
            },
          },
          upSeries: [
            { x: 1547848920000, y: 10 },
            { x: 1547848980000, y: 20 },
            { x: 1547849040000, y: 20 },
            { x: 1547849100000, y: 20 },
            { x: 1547849160000, y: 20 },
            { x: 1547849220000, y: 20 },
            { x: 1547849280000, y: 20 },
            { x: 1547849340000, y: 20 },
            { x: 1547849400000, y: 20 },
            { x: 1547849460000, y: 20 },
            { x: 1547849520000, y: 20 },
            { x: 1547849580000, y: 20 },
            { x: 1547849640000, y: 20 },
            { x: 1547849700000, y: 20 },
            { x: 1547849760000, y: 20 },
            { x: 1547849820000, y: 20 },
            { x: 1547849880000, y: 20 },
            { x: 1547849940000, y: 20 },
            { x: 1547850000000, y: 20 },
            { x: 1547850060000, y: 20 },
            { x: 1547850120000, y: 20 },
            { x: 1547850180000, y: 20 },
            { x: 1547850240000, y: 20 },
            { x: 1547850300000, y: 20 },
            { x: 1547850360000, y: 20 },
            { x: 1547850420000, y: 20 },
            { x: 1547850480000, y: 20 },
            { x: 1547850540000, y: 20 },
            { x: 1547850600000, y: 20 },
            { x: 1547850660000, y: 20 },
            { x: 1547850720000, y: 20 },
            { x: 1547850780000, y: 20 },
            { x: 1547850840000, y: 20 },
            { x: 1547850900000, y: 20 },
            { x: 1547850960000, y: 20 },
            { x: 1547851020000, y: 20 },
            { x: 1547851080000, y: 20 },
            { x: 1547851140000, y: 20 },
            { x: 1547851200000, y: 20 },
            { x: 1547851260000, y: 20 },
            { x: 1547851320000, y: 8 },
          ],
          downSeries: [
            { x: 1547848920000, y: null },
            { x: 1547848980000, y: null },
            { x: 1547849040000, y: null },
            { x: 1547849100000, y: null },
            { x: 1547849160000, y: null },
            { x: 1547849220000, y: null },
            { x: 1547849280000, y: null },
            { x: 1547849340000, y: null },
            { x: 1547849400000, y: null },
            { x: 1547849460000, y: null },
            { x: 1547849520000, y: null },
            { x: 1547849580000, y: null },
            { x: 1547849640000, y: null },
            { x: 1547849700000, y: null },
            { x: 1547849760000, y: null },
            { x: 1547849820000, y: null },
            { x: 1547849880000, y: null },
            { x: 1547849940000, y: null },
            { x: 1547850000000, y: null },
            { x: 1547850060000, y: null },
            { x: 1547850120000, y: null },
            { x: 1547850180000, y: null },
            { x: 1547850240000, y: null },
            { x: 1547850300000, y: null },
            { x: 1547850360000, y: null },
            { x: 1547850420000, y: null },
            { x: 1547850480000, y: null },
            { x: 1547850540000, y: null },
            { x: 1547850600000, y: null },
            { x: 1547850660000, y: null },
            { x: 1547850720000, y: null },
            { x: 1547850780000, y: null },
            { x: 1547850840000, y: null },
            { x: 1547850900000, y: null },
            { x: 1547850960000, y: null },
            { x: 1547851020000, y: null },
            { x: 1547851080000, y: null },
            { x: 1547851140000, y: null },
            { x: 1547851200000, y: null },
            { x: 1547851260000, y: null },
            { x: 1547851320000, y: null },
          ],
        },
      ],
    };
  });

  it('renders a monitor list without errors', () => {
    const { monitors } = monitorResult;
    const component = shallowWithIntl(
      <MonitorList
        dangerColor="danger"
        loading={false}
        monitors={monitors || []}
        primaryColor="primary"
      />
    );
    expect(component).toMatchSnapshot();
  });
});
