/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { once } from 'lodash';
import { getDataClient } from '../kibana_server_services';

const callWithRequest = once(() => getDataClient());

export const callWithRequestFactory = (request) => {
  return (...args) => {
    return (
      callWithRequest()
        .asScoped(request)
        // @ts-ignore
        .callAsCurrentUser(...args)
    );
  };
};
