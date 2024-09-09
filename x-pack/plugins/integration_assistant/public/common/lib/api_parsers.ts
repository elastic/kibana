/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpmPackageResponse } from './api';

/**
 * This is a hacky way to get the integration name from the response.
 * Since the integration name is not returned in the response we have to parse it from the ingest pipeline name.
 * TODO: Return the package name from the fleet API: https://github.com/elastic/kibana/issues/185932
 */
export const getIntegrationNameFromResponse = (response: EpmPackageResponse) => {
  const ingestPipelineName = response.response?.[0]?.id;
  if (ingestPipelineName) {
    const match = ingestPipelineName.match(/^.*-([a-z\d_]+)\..*-([\d\.]+)$/);
    const integrationName = match?.at(1);
    const version = match?.at(2);
    if (integrationName && version) {
      return `${integrationName}-${version}`;
    }
  }
  return '';
};
