/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRandomString } from '@kbn/test-jest-helpers';
import { AutoFollowPattern } from '../../../../common/types';

export const getAutoFollowPatternMock = ({
  name = getRandomString(),
  active = false,
  remoteCluster = getRandomString(),
  leaderIndexPatterns = [`${getRandomString()}-*`],
  followIndexPattern = getRandomString(),
}: {
  name: string;
  active: boolean;
  remoteCluster: string;
  leaderIndexPatterns: string[];
  followIndexPattern: string;
}): AutoFollowPattern => ({
  name,
  active,
  remoteCluster,
  leaderIndexPatterns,
  followIndexPattern,
});
