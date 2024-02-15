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

// Dummy data
import { clickCoordinates as dummryCoordinates } from './data/coords_1024_1033';

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
  const { referenceWidth, referenceHeight, maxWidth } = params;

  // Query coordinates while respecting serviceName, environment, rangeFrom, rangeTo
  // AND where coordinate.x respects minWidth and maxWidth

  // The fetching part should not react to referenceWidth and referenceHeight parameters so that if
  // only referenceWidth/referenceHeight change, already fetched coordinates are transformed

  // Project the coordinates according to referenceWidth and referenceHeight before returning

  const shouldReturnDummyCoordinates =
    referenceWidth === 1200 && referenceHeight === 600;
  const innerWidth = shouldReturnDummyCoordinates ? dummyInnerWidth : maxWidth;
  const innerHeight = shouldReturnDummyCoordinates
    ? dummyInnerHeight
    : referenceHeight;

  const queryCoordinates = useQueryCoordinates(params);

  const coordinatesByWidth = shouldReturnDummyCoordinates
    ? { [innerWidth]: dummryCoordinates }
    : queryCoordinates;

  // For each width, project the coordinates according to referenceWidth and referenceHeight
  const viewportTranslatedCoordinates = Object.entries(coordinatesByWidth)
    .map(([width, coordinates]) =>
      projectPixelCoordsToViewportSize(
        Number(width),
        innerHeight,
        referenceWidth,
        referenceHeight,
        coordinates
      )
    )
    .reduce((acc, coordinates) => [...acc, ...coordinates], []);

  return {
    innerWidth,
    innerHeight,
    clickCoordinates: viewportTranslatedCoordinates,
  };
}

function useQueryCoordinates({
  serviceName,
  minWidth,
  maxWidth,
}: FetchClickDataParams) {
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
              {
                range: {
                  'numeric_labels.width': {
                    gte: minWidth,
                    lte: maxWidth,
                  },
                },
              },
            ],
          },
        },
      },
    }),
    [serviceName, minWidth, maxWidth],
    { name: `getCLickMapList` }
  );

  return (
    data?.hits.hits.reduce((acc, hit) => {
      const x = (hit._source as any).numeric_labels.x;
      const y = (hit._source as any).numeric_labels.y;
      const width = (hit._source as any).numeric_labels.width;

      const key = `${width}`;
      const coordinates = acc[key] || [];
      coordinates.push({ x, y });
      acc[key] = coordinates;
      return acc;
    }, {} as { [key: string]: Array<{ x: number; y: number }> }) ?? {}
  );
}
