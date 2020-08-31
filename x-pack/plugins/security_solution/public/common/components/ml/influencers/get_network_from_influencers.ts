/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DestinationOrSource, isDestinationOrSource } from '../types';
import { getEntries } from '../get_entries';

export const getNetworkFromInfluencers = (
  influencers: Array<Record<string, string>> = [],
  ip?: string
): { ip: string; type: DestinationOrSource } | null => {
  const recordFound = influencers.find((influencer) => {
    const [influencerName, influencerValue] = getEntries(influencer);
    if (isDestinationOrSource(influencerName)) {
      if (ip == null) {
        return true;
      } else {
        return influencerValue === ip;
      }
    } else {
      return false;
    }
  });

  if (recordFound != null) {
    const [influencerName] = getEntries(recordFound);
    if (isDestinationOrSource(influencerName)) {
      return { ip: Object.values(recordFound)[0], type: influencerName };
    } else {
      // default to destination.ip
      return { ip: Object.values(recordFound)[0], type: 'destination.ip' };
    }
  } else {
    return null;
  }
};
