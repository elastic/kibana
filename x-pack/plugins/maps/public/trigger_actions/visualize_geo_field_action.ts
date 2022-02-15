/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid/v4';
import { i18n } from '@kbn/i18n';
import type { SerializableRecord } from '@kbn/utility-types';
import { getUsageCollection } from '../kibana_services';
import { APP_ID } from '../../common/constants';

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
  getCore,
} from '../kibana_services';
import { MapsAppLocator, MAPS_APP_LOCATOR } from '../locators';
import { LAYER_TYPE, SOURCE_TYPES, SCALING_TYPES } from '../../common/constants';
import { LayerDescriptor } from '../../common/descriptor_types';

export const visualizeGeoFieldAction = createAction<VisualizeFieldContext>({
  id: ACTION_VISUALIZE_GEO_FIELD,
  type: ACTION_VISUALIZE_GEO_FIELD,
  getDisplayName: () =>
    i18n.translate('xpack.maps.discover.visualizeFieldLabel', {
      defaultMessage: 'Visualize in Maps',
    }),
  isCompatible: async () => !!getVisualizeCapabilities().show,
  getHref: async (context) => {
    const { app, path } = await getMapsLink(context);

    return getCore().application.getUrlForApp(app, {
      path,
      absolute: false,
    });
  },
  execute: async (context) => {
    const { app, path, state } = await getMapsLink(context);

    const usageCollection = getUsageCollection();
    usageCollection?.reportUiCounter(
      APP_ID,
      'visualize_geo_field',
      context.originatingApp ? context.originatingApp : 'unknownOriginatingApp'
    );

    getCore().application.navigateToApp(app, {
      path,
      state,
    });
  },
});

const getMapsLink = async (context: VisualizeFieldContext) => {
  const indexPattern = await getIndexPatternService().get(context.indexPatternId);
  // create initial layer descriptor
  const hasTooltips =
    context?.contextualFields?.length && context?.contextualFields[0] !== '_source';
  const initialLayers = [
    {
      id: uuid(),
      visible: true,
      type: LAYER_TYPE.MVT_VECTOR,
      sourceDescriptor: {
        id: uuid(),
        type: SOURCE_TYPES.ES_SEARCH,
        tooltipProperties: hasTooltips ? context.contextualFields : [],
        label: indexPattern.title,
        indexPatternId: context.indexPatternId,
        geoField: context.fieldName,
        scalingType: SCALING_TYPES.MVT,
      },
    },
  ];

  const locator = getShareService().url.locators.get(MAPS_APP_LOCATOR) as MapsAppLocator;
  const location = await locator.getLocation({
    filters: getData().query.filterManager.getFilters(),
    query: getData().query.queryString.getQuery(),
    initialLayers: initialLayers as unknown as LayerDescriptor[] & SerializableRecord,
    timeRange: getData().query.timefilter.timefilter.getTime(),
  });

  return location;
};
