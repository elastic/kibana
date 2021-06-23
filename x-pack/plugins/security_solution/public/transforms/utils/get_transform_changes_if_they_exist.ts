/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { adjustTimeRange } from './adjust_timerange';
import { getSettingsMatch } from './get_settings_match';
import { getTransformChanges } from './get_transform_changes';
import { isFilterQueryCompatible } from './is_filter_query_compatible';
import { GetTransformChangesIfTheyExist } from './types';

// TODO: Add the other switches here such as the disabling of a widget/factory type
// or if a transform is disabled, then this cannot use the query
export const getTransformChangesIfTheyExist: GetTransformChangesIfTheyExist = ({
  factoryQueryType,
  indices,
  transformSettings,
  filterQuery,
  histogramType,
  timerange,
}) => {
  if (!transformSettings.enabled) {
    // Early return if we are not enabled
    return { factoryQueryType, indices, timerange };
  }

  if (!isFilterQueryCompatible(filterQuery)) {
    // Early return if the filter query is not compatible
    return { factoryQueryType, indices, timerange };
  }

  const { timeRangeAdjusted, duration } = adjustTimeRange(timerange);

  if (timeRangeAdjusted == null || duration == null || duration.asHours() < 1) {
    // Early return if we are less than hour of time or from is something not as we expect
    // and as we should just use raw events instead of summaries
    return { factoryQueryType, indices, timerange };
  }

  const settings = getSettingsMatch({ indices, transformSettings });
  if (settings == null) {
    // early return if none of the settings match
    return { factoryQueryType, indices, timerange };
  }

  const transform = getTransformChanges({ factoryQueryType, settings, histogramType });
  if (transform) {
    return { ...transform, timerange: timeRangeAdjusted };
  }

  // nothing matched, return what was sent in unchanged
  return { factoryQueryType, indices, timerange };
};
