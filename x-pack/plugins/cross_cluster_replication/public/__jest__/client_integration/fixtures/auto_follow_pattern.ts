/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TestUtils } from 'src/plugins/es_ui_shared/public';
import { AutoFollowPattern } from '../../../../common/types';

const { getRandomString } = TestUtils;

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
