/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omitBy } from 'lodash';
import { isDefined } from '@kbn/ml-is-defined';
import { HttpService } from '../http_service';
import { basePath } from '.';

export interface GetSchemaDefinitionParams {
  path: string;
  method: string;
}

export function jsonSchemaProvider(httpService: HttpService) {
  const apiBasePath = basePath();

  return {
    getSchemaDefinition(params: GetSchemaDefinitionParams) {
      return httpService.http<any>({
        path: `${apiBasePath}/json_schema`,
        method: 'GET',
        query: omitBy(params, (v) => !isDefined(v)),
      });
    },
  };
}
