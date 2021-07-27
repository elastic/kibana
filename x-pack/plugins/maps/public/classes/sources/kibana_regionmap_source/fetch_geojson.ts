/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { FeatureCollection } from 'geojson';
import * as topojson from 'topojson-client';
import { GeometryCollection } from 'topojson-specification';
import fetch from 'node-fetch';

export enum FORMAT_TYPE {
  GEOJSON = 'geojson',
  TOPOJSON = 'topojson',
}

export async function fetchGeoJson(
  fetchUrl: string,
  format: FORMAT_TYPE,
  featureCollectionPath: string
): Promise<FeatureCollection> {
  let fetchedJson;
  try {
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error('Request failed');
    }
    fetchedJson = await response.json();
  } catch (e) {
    throw new Error(
      i18n.translate('xpack.maps.util.requestFailedErrorMessage', {
        defaultMessage: `Unable to fetch vector shapes from url: {fetchUrl}`,
        values: { fetchUrl },
      })
    );
  }

  if (format === FORMAT_TYPE.GEOJSON) {
    return fetchedJson;
  }

  if (format === FORMAT_TYPE.TOPOJSON) {
    const features = _.get(fetchedJson, `objects.${featureCollectionPath}`) as GeometryCollection;
    return topojson.feature(fetchedJson, features);
  }

  throw new Error(
    i18n.translate('xpack.maps.util.formatErrorMessage', {
      defaultMessage: `Unable to fetch vector shapes from url: {format}`,
      values: { format },
    })
  );
}
