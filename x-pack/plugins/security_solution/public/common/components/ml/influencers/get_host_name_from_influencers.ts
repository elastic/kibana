/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getEntries } from '../get_entries';

export const getHostNameFromInfluencers = (
  influencers: Array<Record<string, string>> = [],
  hostName?: string
): string | null => {
  const recordFound = influencers.find((influencer) => {
    const [influencerName, influencerValue] = getEntries(influencer);
    if (influencerName === 'host.name') {
      if (hostName == null) {
        return true;
      } else {
        return influencerValue === hostName;
      }
    } else {
      return false;
    }
  });
  if (recordFound != null) {
    return Object.values(recordFound)[0];
  } else {
    return null;
  }
};
