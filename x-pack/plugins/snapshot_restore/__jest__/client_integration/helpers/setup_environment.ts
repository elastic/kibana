/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';

import { httpService } from '../../../public/app/services/http';
import { init as initHttpRequests } from './http_requests';

export const setupEnvironment = () => {
  httpService.init(axios.create(), { addBasePath: (path: string) => path });

  const { server, httpRequestsMockHelpers } = initHttpRequests();

  return {
    server,
    httpRequestsMockHelpers,
  };
};
