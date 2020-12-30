/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfluencerInput } from '../types';
import { HostItem } from '../../../../graphql/types';

export const hostToInfluencers = (hostItem: HostItem): InfluencerInput[] | null => {
  if (hostItem.host != null && hostItem.host.name != null) {
    const influencers: InfluencerInput[] = [
      {
        fieldName: 'host.name',
        fieldValue: hostItem.host.name[0],
      },
    ];
    return influencers;
  } else {
    return null;
  }
};
