/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import { i18n } from '@kbn/i18n';
import '../../../classes/sources/wms_source';
import '../../../classes/sources/ems_file_source';
import '../../../classes/sources/es_search_source';
import '../../../classes/sources/es_pew_pew_source';
import '../../../classes/sources/es_geo_grid_source';
import '../../../classes/sources/xyz_tms_source';
import { LayerDescriptor } from '../../../../common';
import { getToasts } from '../../../kibana_services';
import { INITIAL_LAYERS_KEY } from '../../../../common/constants';

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function parseLayerDescriptors(mapInitLayers: string): LayerDescriptor[] {
  const raw: any[] = rison.decodeArray(mapInitLayers);

  return raw.flatMap((desc, i) => {
    if (isObj(desc) && typeof desc.id === 'string') {
      return desc as LayerDescriptor;
    }

    // we shouldn't end up here, but if we do it's likely only in testing or local dev so a console error is suitable
    // eslint-disable-next-line no-console
    console.error(`item ${i} in mapInitLayers is not a valid LayerDescriptor and was ignored`);
    return [];
  });
}

export function getInitialLayersFromUrlParam(): LayerDescriptor[] {
  const locationSplit = window.location.href.split('?');
  if (locationSplit.length <= 1) {
    return [];
  }
  const mapAppParams = new URLSearchParams(locationSplit[1]);
  let mapInitLayers = mapAppParams.get(INITIAL_LAYERS_KEY);
  if (!mapInitLayers) {
    return [];
  }

  try {
    // strip # from the end of the param
    if (mapInitLayers.endsWith('#')) {
      mapInitLayers = mapInitLayers.slice(0, -1);
    }

    return parseLayerDescriptors(mapInitLayers);
  } catch (e) {
    getToasts().addWarning({
      title: i18n.translate('xpack.maps.initialLayers.unableToParseTitle', {
        defaultMessage: `Initial layers not added to map`,
      }),
      text: i18n.translate('xpack.maps.initialLayers.unableToParseMessage', {
        defaultMessage: `Unable to parse contents of 'initialLayers' parameter. Error: {errorMsg}`,
        values: { errorMsg: e.message },
      }),
    });
    return [];
  }
}
