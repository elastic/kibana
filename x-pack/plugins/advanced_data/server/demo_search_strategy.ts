/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import {
  IDemoDataResponse,
  IDemoDataHit,
  TDemoDataSearchStrategyProvider,
  IDemoDataRequest,
} from './types';

function createHits(numberOfHits: number): IDemoDataHit[] {
  const hits: IDemoDataHit[] = [];
  for (let i = 0; i < numberOfHits; i++) {
    hits.push({
      title: (Math.random() * 2)
        .toString(36)
        .replace(/[^a-z]+/g, '')
        .substr(Math.random() * 10),
      message: (Math.random() * 2)
        .toString(36)
        .replace(/[^a-z]+/g, '')
        .substr(Math.random() * 30),
    });
  }
  return hits;
}

function createResponse(
  totalHitCount: number,
  numberOfHits: number,
  id?: string
): IDemoDataResponse {
  return {
    id,
    total: totalHitCount,
    loaded: numberOfHits,
    hits: createHits(numberOfHits),
  };
}

export const demoSearchStrategyProvider: TDemoDataSearchStrategyProvider = searchesInProgress => {
  return {
    search: async (request: IDemoDataRequest) => {
      console.log('search with demoSearchStrategyProvider, request is ', request);
      const searchInProgress = request.id ? searchesInProgress[request.id] : undefined;
      console.log('searchInProgress is ', searchInProgress);
      const requestStartTime = searchInProgress ? searchInProgress.requestStartTime : Date.now();
      const timeElapsed = Date.now() - requestStartTime;
      const shouldFinish =
        timeElapsed > request.responseTime * 1000 ||
        (searchInProgress && request.totalHitCount === searchInProgress.response.hits.length);

      console.log('shouldFinish is ', shouldFinish);
      if (shouldFinish) {
        return searchInProgress
          ? {
              ...searchInProgress.response,
              total: searchInProgress.total,
              loaded: searchInProgress.total,
              hits: {
                ...searchInProgress.response.hits,
                ...createHits(request.totalHitCount - searchInProgress.response.hits.length),
              },
            }
          : createResponse(request.totalHitCount, request.totalHitCount, request.id);
      }

      const responseTime = searchInProgress ? searchInProgress.responseTime : request.responseTime;
      const totalHitCount = searchInProgress ? searchInProgress.total : request.totalHitCount;
      console.log('responseTime: ', responseTime);
      console.log('totalHitCount: ', totalHitCount);
      // Build a partial response to send back, base it off the total time it should take
      const hitsToCreateCount = Math.ceil(totalHitCount / responseTime);
      console.log('hitsToCreateCount: ', hitsToCreateCount);
      const hitsAlreadyCreated = searchInProgress ? searchInProgress.response.hits : [];
      const id = request.id || uuid.v4();
      const hitsAlreadyCreatedCount = hitsAlreadyCreated.length;
      console.log('hitsAlreadyCreatedCount: ', hitsAlreadyCreatedCount);

      const partialResponse = {
        id,
        total: totalHitCount,
        loaded: hitsToCreateCount + hitsAlreadyCreatedCount,
        hits: [...hitsAlreadyCreated, ...createHits(hitsToCreateCount)],
      };
      searchesInProgress[id] = {
        request,
        response: partialResponse,
        requestStartTime,
        total: totalHitCount,
        loaded: hitsToCreateCount + hitsAlreadyCreatedCount,
        responseTime: searchInProgress ? searchInProgress.responseTime : request.responseTime,
      };

      console.log('returning partial response ', partialResponse);
      return partialResponse;
    },
  };
};
