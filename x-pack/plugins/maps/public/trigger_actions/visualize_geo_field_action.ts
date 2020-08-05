/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import rison from 'rison-node';
import uuid from 'uuid/v4';
import { stringify } from 'query-string';
import { i18n } from '@kbn/i18n';
import { createAction } from '../../../../../src/plugins/ui_actions/public';
import {
  createKbnUrlStateStorage,
  IKbnUrlStateStorage,
} from '../../../../../src/plugins/kibana_utils/public';
import { DiscoverAppState } from '../../../../../src/plugins/discover/public';
import { getApplication, getIndexPatternService } from '../kibana_services';

export const ACTION_VISUALIZE_GEO_FIELD = 'ACTION_VISUALIZE_GEO_FIELD';

export const visualizeGeoFieldAction = createAction<typeof ACTION_VISUALIZE_GEO_FIELD>({
  type: ACTION_VISUALIZE_GEO_FIELD,
  getDisplayName: () =>
    i18n.translate('xpack.maps.discover.visualizeFieldLabel', {
      defaultMessage: 'Visualize on a map',
    }),
  execute: async (context) => {
    const indexPattern = await getIndexPatternService().get(context.indexPatternId);
    const field = indexPattern.fields.find((fld) => fld.name === context.fieldName);
    const supportsClustering = field?.aggregatable;
    const stateStorage: IKbnUrlStateStorage = createKbnUrlStateStorage();
    const appStateFromUrl: DiscoverAppState | null = stateStorage.get('_a');
    // create initial layer descriptor
    const hasTooltips =
      context?.contextualFields?.length && context?.contextualFields[0] !== '_source';

    const linkUrlParams = {
      _a: rison.encode({
        filters: appStateFromUrl?.filters || [],
        query: appStateFromUrl?.query,
      } as any),
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
          tooltipProperties: hasTooltips ? context.contextualFields : [],
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
