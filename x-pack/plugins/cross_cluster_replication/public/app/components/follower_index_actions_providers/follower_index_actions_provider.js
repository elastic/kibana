/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { FollowerIndexPauseProvider } from './follower_index_pause_provider';
import { FollowerIndexResumeProvider } from './follower_index_resume_provider';
import { FollowerIndexUnfollowProvider } from './follower_index_unfollow_provider';

export const FollowerIndexActionsProvider = (props) => {
  return (
    <FollowerIndexPauseProvider>
      {(pauseFollowerIndex) => (
        <FollowerIndexResumeProvider>
          {(resumeFollowerIndex) => (
            <FollowerIndexUnfollowProvider>
              {(unfollowLeaderIndex) => {
                const { children } = props;
                return children(() => ({
                  pauseFollowerIndex,
                  resumeFollowerIndex,
                  unfollowLeaderIndex,
                }));
              }}
            </FollowerIndexUnfollowProvider>
          )}
        </FollowerIndexResumeProvider>
      )}
    </FollowerIndexPauseProvider>
  );
};
