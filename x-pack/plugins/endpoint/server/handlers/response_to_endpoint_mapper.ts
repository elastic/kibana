/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { EndpointData } from '../types';

interface HitSource {
  _source: EndpointData;
}

export class ResponseToEndpointMapper {
  mapHits(searchResponse: SearchResponse<EndpointData>): EndpointData[] {
    return searchResponse.hits.hits.map(response => response._source);
  }
  /* trigger build*/
  mapInnerHits(searchResponse: SearchResponse<EndpointData>): EndpointData[] {
    return searchResponse.hits.hits
      .map(response => response.inner_hits.most_recent.hits.hits)
      .flatMap(data => data as HitSource)
      .map(entry => entry._source);
  }
}
