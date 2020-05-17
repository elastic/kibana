/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { MAP_SAVED_OBJECT_TYPE } from '../../../../plugins/maps/public';
import { VISUALIZE_EMBEDDABLE_TYPE } from '../../../../../src/plugins/visualizations/public';
import { LENS_EMBEDDABLE_TYPE } from '../../../../plugins/lens/common/constants';
import { SEARCH_EMBEDDABLE_TYPE } from '../../../../../src/plugins/discover/public';

export const EmbeddableTypes: {
  lens: string;
  map: string;
  search: string;
  visualization: string;
} = {
  lens: LENS_EMBEDDABLE_TYPE,
  map: MAP_SAVED_OBJECT_TYPE,
  search: SEARCH_EMBEDDABLE_TYPE,
  visualization: VISUALIZE_EMBEDDABLE_TYPE,
};
