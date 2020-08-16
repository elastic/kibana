/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { RouterContext } from '../../public/components/router';

export const routerContextDecorator = (story: Function) => (
  <RouterContext.Provider value={{ navigateTo: () => {} }}>{story()}</RouterContext.Provider>
);
