/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route } from 'react-router-dom';

import { PolicyList, PolicyDetails } from './view';

export const getPolicyListRoutes = () => [
  <Route path="/:pageName(policy)" exact component={PolicyList} />,
];

export const getPolicyDetailsRoutes = () => [
  <Route path="/:pageName(policy)/:id" exact component={PolicyDetails} />,
];
