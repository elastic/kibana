/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { SOContentStorage } from '@kbn/content-management-utils';
import { cmServicesDefinition } from '../../common/content_management/cm_services';
import type { GraphCrudTypes } from '../../common/content_management';

const SO_TYPE = 'graph-workspace';

export class GraphStorage extends SOContentStorage<GraphCrudTypes> {
  constructor({
    logger,
    throwOnResultValidationError,
  }: {
    logger: Logger;
    throwOnResultValidationError: boolean;
  }) {
    super({
      savedObjectType: SO_TYPE,
      cmServicesDefinition,
      allowedSavedObjectAttributes: [
        'title',
        'description',
        'kibanaSavedObjectMeta',
        'wsState',
        'version',
        'numLinks',
        'numVertices',
        'legacyIndexPatternRef',
      ],
      logger,
      throwOnResultValidationError,
    });
  }
}
