/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { EMS_DATA_PATH, GIS_API_PATH } from './constants';

export  async function getEMSResources(emsClient, includeElasticMapsService, licenseUid, useAbsoluteEMSPAth) {

  if (!includeElasticMapsService) {
    return {
      fileLayers: [],
      tmsServices: []
    };
  }

  emsClient.addQueryParams({ license: licenseUid });
  const fileLayerObjs = await emsClient.getFileLayers();
  const tmsServicesObjs = await emsClient.getTMSServices();

  const fileLayers = fileLayerObjs.map(fileLayer => {
    //backfill to static settings
    const format = fileLayer.getDefaultFormatType();
    const meta = fileLayer.getDefaultFormatMeta();

    return {
      name: fileLayer.getDisplayName(),
      origin: fileLayer.getOrigin(),
      id: fileLayer.getId(),
      created_at: fileLayer.getCreatedAt(),
      attribution: fileLayer.getHTMLAttribution(),
      attributions: fileLayer.getAttributions(),
      fields: fileLayer.getFieldsInLanguage(),
      // eslint-disable-next-line max-len
      url: useAbsoluteEMSPAth ? fileLayer.getDefaultFormatUrl() : `../${GIS_API_PATH}/${EMS_DATA_PATH}?id=${encodeURIComponent(fileLayer.getId())}`,
      format: format, //legacy: format and meta are split up
      meta: meta, //legacy, format and meta are split up,
      emsLink: fileLayer.getEMSHotLink()
    };
  });

  const tmsServices = tmsServicesObjs.map(tmsService => {
    return {
      origin: tmsService.getOrigin(),
      id: tmsService.getId(),
      minZoom: tmsService.getMinZoom(),
      maxZoom: tmsService.getMaxZoom(),
      attribution: tmsService.getHTMLAttribution(),
      attributionMarkdown: tmsService.getMarkdownAttribution(),
      url: tmsService.getUrlTemplate()
    };
  });

  return { fileLayers, tmsServices };
}
