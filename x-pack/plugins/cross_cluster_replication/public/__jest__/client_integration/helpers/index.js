/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setup as autoFollowPatternListSetup } from './auto_follow_pattern_list.helpers';
import { setup as autoFollowPatternAddSetup } from './auto_follow_pattern_add.helpers';
import { setup as autoFollowPatternEditSetup } from './auto_follow_pattern_edit.helpers';
import { setup as followerIndexListSetup } from './follower_index_list.helpers';
import { setup as followerIndexAddSetup } from './follower_index_add.helpers';
import { setup as followerIndexEditSetup } from './follower_index_edit.helpers';
import { setup as homeSetup } from './home.helpers';

export { nextTick, getRandomString, findTestSubject } from '../../../../../../test_utils';

export { setupEnvironment } from './setup_environment';

export const pageHelpers = {
  autoFollowPatternList: { setup: autoFollowPatternListSetup },
  autoFollowPatternAdd: { setup: autoFollowPatternAddSetup },
  autoFollowPatternEdit: { setup: autoFollowPatternEditSetup },
  followerIndexList: { setup: followerIndexListSetup },
  followerIndexAdd: { setup: followerIndexAddSetup },
  followerIndexEdit: { setup: followerIndexEditSetup },
  home: { setup: homeSetup },
};
