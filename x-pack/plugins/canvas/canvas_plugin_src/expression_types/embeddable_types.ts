/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAP_SAVED_OBJECT_TYPE } from '@kbn/maps-plugin/common';
import { VISUALIZE_EMBEDDABLE_TYPE } from '@kbn/visualizations-plugin/common/constants';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-plugin/common/constants';
import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-plugin/common';

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
