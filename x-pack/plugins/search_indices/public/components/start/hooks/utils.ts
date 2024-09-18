/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart, HttpSetup } from '@kbn/core/public';

const INDEX_DETAILS_PATH = '/app/elasticsearch/indices/index_details';

function getIndexDetailsPath(http: HttpSetup, indexName: string) {
  return http.basePath.prepend(`${INDEX_DETAILS_PATH}/${encodeURIComponent(indexName)}`);
}

export const navigateToIndexDetails = (
  application: ApplicationStart,
  http: HttpSetup,
  indexName: string
) => {
  application.navigateToUrl(getIndexDetailsPath(http, indexName));
};
