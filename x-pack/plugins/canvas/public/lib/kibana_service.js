/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getVisualizeLoader } from 'ui/visualize/loader';

// TODO: getVisualizationList doesn't yet support any pagination or search...
export async function getSavedVisualizations() {
  const loader = await getVisualizeLoader();
  return loader.getVisualizationList();
}
