/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
<<<<<<< HEAD
import { shallow } from 'enzyme';
=======
import { shallowWithIntl } from '../../../../../../test_utils/enzyme_helpers';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
import { Ccr } from './ccr';

describe('Ccr', () => {
  test('that it renders normally', () => {
    const data = [
      {
        follows: 'leader',
        id: 'follower',
        index: 'follower',
        opsSynced: 400,
        syncLagOps: 5,
        syncLagTime: 60000,
        shards: [
          {
            opsSynced: 200,
            shardId: 0,
            syncLagOps: 2,
            syncLagOpsFollower: 1,
            syncLagOpsLeader: 1,
            syncLagTime: 45000
          },
          {
            opsSynced: 200,
            shardId: 1,
            syncLagOps: 1,
            syncLagOpsFollower: 0,
            syncLagOpsLeader: 1,
            syncLagTime: 60000
          }
        ]
      },
      {
        follows: 'leader2',
        id: 'follower2',
        index: 'follower2',
        opsSynced: 50,
        syncLagOps: 1,
        syncLagTime: 12000,
        error: 'not_working_properly',
        shards: [
          {
            opsSynced: 20,
            shardId: 1,
            syncLagOps: 0,
            syncLagOpsFollower: 0,
            syncLagOpsLeader: 0,
            syncLagTime: 11000
          },
          {
            opsSynced: 30,
            shardId: 2,
            syncLagOps: 5,
            syncLagOpsFollower: 5,
            syncLagOpsLeader: 0,
            syncLagTime: 1000,
            error: 'not_working_properly'
          }
        ]
      }
    ];

<<<<<<< HEAD
    const component = shallow(<Ccr data={data} />);
=======
    const component = shallowWithIntl(<Ccr.WrappedComponent data={data} />);
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    expect(component).toMatchSnapshot();
  });
});
