/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type MlUrlConfig, isMlKibanaUrlConfigWithTimeRange } from '@kbn/ml-anomaly-utils';
import { isValidLabel, isValidTimeRange } from '../../util/custom_url_utils';

export function isValidCustomUrls(customUrls: MlUrlConfig[]) {
  if (customUrls === undefined || customUrls.length === 0) {
    return true;
  }

  // Check all the custom URLs have unique labels and the time range is valid.
  const isInvalidItem = customUrls.some((customUrl, index) => {
    // Validate the label.
    const label = customUrl.url_name;
    const otherUrls = [...customUrls];
    otherUrls.splice(index, 1); // Don't compare label with itself.
    let itemValid = isValidLabel(label, otherUrls);
    if (itemValid === true && isMlKibanaUrlConfigWithTimeRange(customUrl)) {
      // Validate the time range.
      const timeRange = customUrl.time_range;
      itemValid = isValidTimeRange(timeRange);
    }

    return !itemValid;
  });

  return !isInvalidItem;
}
