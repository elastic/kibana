/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeCloudId } from '@kbn/fleet-plugin/common';

export function getCloudUrls(cloudId: string) {
  const decodedCloudId = decodeCloudId(cloudId);
  if (decodedCloudId) {
    return {
      elasticsearchUrl: decodedCloudId.elasticsearchUrl,
      kibanaUrl: decodedCloudId.kibanaUrl,
    };
  }
}
