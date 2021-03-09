/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '../../../../../../src/core/server';

import { createPackRoute } from './create_pack_route';
import { deletePackRoute } from './delete_pack_route';
import { findPackRoute } from './find_pack_route';
import { readPackRoute } from './read_pack_route';
import { updatePackRoute } from './update_pack_route';

export const initPackRoutes = (router: IRouter) => {
  createPackRoute(router);
  deletePackRoute(router);
  findPackRoute(router);
  readPackRoute(router);
  updatePackRoute(router);
};
