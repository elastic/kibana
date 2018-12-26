/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { deserializeAutoFollowStats } from './ccr_stats_serialization';

describe('[CCR] auto-follow stats serialization', () => {
  it('should deserialize auto-follow stats', () => {
    const esObject = {
      "number_of_failed_follow_indices": 0,
      "number_of_failed_remote_cluster_state_requests": 0,
      "number_of_successful_follow_indices": 0,
      "recent_auto_follow_errors": [],
      "auto_followed_clusters": []
    };

    expect(deserializeAutoFollowStats(esObject)).toMatchSnapshot();
  });
});
