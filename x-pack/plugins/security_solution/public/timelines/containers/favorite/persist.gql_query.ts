/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import gql from 'graphql-tag';

export const persistTimelineFavoriteMutation = gql`
  mutation PersistTimelineFavoriteMutation(
    $timelineId: ID
    $templateTimelineId: String
    $templateTimelineVersion: Int
    $timelineType: TimelineType!
  ) {
    persistFavorite(
      timelineId: $timelineId
      templateTimelineId: $templateTimelineId
      templateTimelineVersion: $templateTimelineVersion
      timelineType: $timelineType
    ) {
      savedObjectId
      version
      favorite {
        fullName
        userName
        favoriteDate
      }
      templateTimelineId
      templateTimelineVersion
      timelineType
    }
  }
`;
