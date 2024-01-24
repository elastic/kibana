/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const dummyInnerWidth = 1024;
const dummyInnerHeight = 1033;

import {
  createEsParams,
  useEsSearch,
} from '@kbn/observability-shared-plugin/public';
import { projectPixelCoordsToViewportSize } from './map/helpers';

interface FetchClickDataParams {
  serviceName?: string;
  environment?: string;
  rangeFrom?: string;
  rangeTo?: string;
  minWidth: number;
  maxWidth: number;
  referenceWidth: number; // Width of the reference screenshot
  referenceHeight: number; // Height of the reference screenshot
}
export function useFetchClickData(params: FetchClickDataParams) {
  const { referenceWidth, referenceHeight, serviceName } = params;
  console.log(params);

  // Query coordinates while respecting serviceName, environment, rangeFrom, rangeTo
  // AND where coordinate.x respects minWidth and maxWidth

  // The fetching part should not react to referenceWidth and referenceHeight parameters so that if
  // only referenceWidth/referenceHeight change, already fetched coordinates are transformed

  // Project the coordinates according to referenceWidth and referenceHeight before returning

  const { data } = useEsSearch(
    createEsParams({
      index: '*traces-apm.rum*',
      body: {
        size: 1000,
        query: {
          bool: {
            filter: [
              {
                term: {
                  'service.name': serviceName,
                },
              },
              {
                bool: {
                  should: [
                    {
                      exists: {
                        field: 'numeric_labels.x',
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
      },
    }),
    [serviceName],
    { name: `getCLickMapList` }
  );

  const coordinates = data?.hits?.hits?.map((hit) => ({
    x: hit._source.numeric_labels.x,
    y: hit._source.numeric_labels.y,
  }));

  const innerWidth = dummyInnerWidth;
  const innerHeight = dummyInnerHeight;
  const clickCoordinates: Array<{ x: number; y: number }> = coordinates;
  const viewportTranslatedCoordinates = projectPixelCoordsToViewportSize(
    innerWidth,
    innerHeight,
    referenceWidth,
    referenceHeight,
    clickCoordinates
  );

  return {
    innerWidth,
    innerHeight,
    clickCoordinates: viewportTranslatedCoordinates,
  };
}
