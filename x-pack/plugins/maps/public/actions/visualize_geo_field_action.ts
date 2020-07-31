/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import rison from 'rison-node';
import uuid from 'uuid/v4';
import { stringify } from 'query-string';
import { createAction } from '../../../../../src/plugins/ui_actions/public';
import { getApplication, getIndexPatternService } from '../kibana_services';

export const ACTION_VISUALIZE_GEO_FIELD = 'ACTION_VISUALIZE_GEO_FIELD';

export const visualizeGeoFieldAction = createAction<typeof ACTION_VISUALIZE_GEO_FIELD>({
  type: ACTION_VISUALIZE_GEO_FIELD,
  getDisplayName: () => 'Visualize Geo Field',
  execute: async (context) => {
    const indexPattern = await getIndexPatternService().get(context.indexPatternId);
    const field = indexPattern.fields.find((fld) => fld.name === context.fieldName);
    const supportsClustering = field?.aggregatable;
    // create initial layer descriptor
    const hasTooltips =
      context.tooltipProperties?.length && context.tooltipProperties[0] !== '_source';

    const linkUrlParams = {
      initialLayers: rison.encode({
        id: uuid(),
        indexPattern: context.indexPatternId,
        label: indexPattern.title,
        visible: true,
        type: supportsClustering ? 'BLENDED_VECTOR' : 'VECTOR',
        sourceDescriptor: {
          id: uuid(),
          type: 'ES_SEARCH',
          geoField: context.fieldName,
          tooltipProperties: hasTooltips ? context.tooltipProperties : [],
          indexPatternId: context.indexPatternId,
          scalingType: supportsClustering ? 'CLUSTERS' : 'LIMIT',
        },
      }),
    };

    getApplication().navigateToApp('maps', {
      path: `/map#?${stringify(linkUrlParams)}`,
    });
  },
});
