/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { CcrShard } from './ccr_shard';

jest.mock('../../chart', () => ({
  MonitoringTimeseriesContainer: () => 'MonitoringTimeseriesContainer',
}));

describe('CcrShard', () => {
  const props = {
    formattedLeader: 'leader on remote',
    metrics: [],
    stat: {
      read_exceptions: [],
      follower_global_checkpoint: 3049,
      follower_index: 'follower',
      follower_max_seq_no: 3049,
      last_requested_seq_no: 3049,
      leader_global_checkpoint: 3049,
      leader_index: 'leader',
      leader_max_seq_no: 3049,
      mapping_version: 2,
      number_of_concurrent_reads: 1,
      number_of_concurrent_writes: 0,
      number_of_failed_bulk_operations: 0,
      failed_read_requests: 0,
      operations_written: 3050,
      number_of_queued_writes: 0,
      number_of_successful_bulk_operations: 3050,
      number_of_successful_fetches: 3050,
      operations_received: 3050,
      shard_id: 0,
      time_since_last_read_millis: 9402,
      total_fetch_time_millis: 44128980,
      total_index_time_millis: 41827,
      total_transferred_bytes: 234156,
    },
    oldestStat: {
      failed_read_requests: 0,
      operations_written: 2976,
    },
    timestamp: '2018-09-27T13:32:09.412Z',
  };

  test('that it renders normally', () => {
    const component = shallow(<CcrShard {...props} />);
    expect(component).toMatchSnapshot();
  });

  test('that is renders an exception properly', () => {
    const localProps = {
      ...props,
      stat: {
        ...props.stat,
        read_exceptions: [
          {
            type: 'something_is_wrong',
            reason: 'not sure but something happened',
          },
        ],
      },
    };

    const component = shallow(<CcrShard {...localProps} />);
    expect(component.find('EuiPanel').get(0)).toMatchSnapshot();
  });
});
