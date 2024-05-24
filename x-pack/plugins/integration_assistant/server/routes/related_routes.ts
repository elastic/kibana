/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { RELATED_GRAPH_PATH } from '../../common';

export function registerRelatedRoutes(router: IRouter) {
  router.post(
    {
      path: `${RELATED_GRAPH_PATH}`,
      validate: false,
    },
    async (ctx, req, res) => {
      return res.ok();
    }
  );
}
