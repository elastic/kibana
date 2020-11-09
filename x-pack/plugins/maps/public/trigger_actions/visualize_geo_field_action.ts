/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid/v4';
import { i18n } from '@kbn/i18n';
import {
  createAction,
  ACTION_VISUALIZE_GEO_FIELD,
  VisualizeFieldContext,
} from '../../../../../src/plugins/ui_actions/public';
import {
  getVisualizeCapabilities,
  getIndexPatternService,
  getData,
  getShareService,
  getNavigateToApp,
} from '../kibana_services';
import { MAPS_APP_URL_GENERATOR, MapsUrlGeneratorState } from '../url_generator';
import { LAYER_TYPE, SOURCE_TYPES, SCALING_TYPES, APP_ID, MAP_PATH } from '../../common/constants';

export const visualizeGeoFieldAction = createAction<typeof ACTION_VISUALIZE_GEO_FIELD>({
  type: ACTION_VISUALIZE_GEO_FIELD,
  getDisplayName: () =>
    i18n.translate('xpack.maps.discover.visualizeFieldLabel', {
      defaultMessage: 'Visualize in Maps',
    }),
  isCompatible: async () => !!getVisualizeCapabilities().show,
  getHref: async (context) => {
    const url = await getMapsLink(context);
    return url;
  },
  execute: async (context) => {
    const url = await getMapsLink(context);
    const hash = url.split('#')[1];

    getNavigateToApp()(APP_ID, {
      path: `${MAP_PATH}/#${hash}`,
    });
  },
});

const getMapsLink = async (context: VisualizeFieldContext) => {
  const indexPattern = await getIndexPatternService().get(context.indexPatternId);
  const field = indexPattern.fields.find((fld) => fld.name === context.fieldName);
  const supportsClustering = field?.aggregatable;
  // create initial layer descriptor
  const hasTooltips =
    context?.contextualFields?.length && context?.contextualFields[0] !== '_source';
  const initialLayers = [
    {
      id: uuid(),
      visible: true,
      type: supportsClustering ? LAYER_TYPE.BLENDED_VECTOR : LAYER_TYPE.VECTOR,
      sourceDescriptor: {
        id: uuid(),
        type: SOURCE_TYPES.ES_SEARCH,
        tooltipProperties: hasTooltips ? context.contextualFields : [],
        label: indexPattern.title,
        indexPatternId: context.indexPatternId,
        geoField: context.fieldName,
        scalingType: supportsClustering ? SCALING_TYPES.CLUSTERS : SCALING_TYPES.LIMIT,
      },
    },
  ];

  const generator = getShareService().urlGenerators.getUrlGenerator(MAPS_APP_URL_GENERATOR);
  const urlState: MapsUrlGeneratorState = {
    filters: getData().query.filterManager.getFilters(),
    query: getData().query.queryString.getQuery(),
    initialLayers,
    timeRange: getData().query.timefilter.timefilter.getTime(),
  };
  return generator.createUrl(urlState);
};
