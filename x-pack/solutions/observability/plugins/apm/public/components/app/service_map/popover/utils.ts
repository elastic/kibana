/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this code except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapNode, ServiceMapEdge } from '../../../../../common/service_map';

export type ServiceMapSelection = ServiceMapNode | ServiceMapEdge;

export function isEdge(selection: ServiceMapSelection): selection is ServiceMapEdge {
  return 'source' in selection && 'target' in selection;
}
