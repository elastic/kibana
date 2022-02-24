/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import '../../../classes/sources/wms_source';
import '../../../classes/sources/ems_file_source';
import '../../../classes/sources/es_search_source';
import '../../../classes/sources/es_pew_pew_source';
import '../../../classes/sources/es_geo_grid_source';
import '../../../classes/sources/xyz_tms_source';
import { getToasts } from '../../../kibana_services';

export function getOpenLayerWizardFromUrlParam() {
  const locationSplit = window.location.href.split('?');
  if (locationSplit.length <= 1) {
    return '';
  }
  const mapAppParams = new URLSearchParams(locationSplit[1]);
  if (!mapAppParams.has('openLayerWizard')) {
    return '';
  }

  try {
    return mapAppParams.get('openLayerWizard') ? mapAppParams.get('openLayerWizard') : '';
  } catch (e) {
    getToasts().addWarning({
      title: i18n.translate('xpack.maps.initialLayers.unableToParseTitle', {
        defaultMessage: `Initial layers not added to map`,
      }),
      text: i18n.translate('xpack.maps.initialLayers.unableToParseMessage', {
        defaultMessage: `Unable to parse contents of 'openLayerWizard' parameter. Error: {errorMsg}`,
        values: { errorMsg: e.message },
      }),
    });
    return '';
  }
}
