/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FetchPolicy } from 'apollo-client';
import { isString } from 'lodash/fp';

import { ESQuery } from '../../../common/typed_json';

export const createFilter = (filterQuery: ESQuery | string | undefined) =>
  isString(filterQuery) ? filterQuery : JSON.stringify(filterQuery);

export const getDefaultFetchPolicy = (): FetchPolicy => 'cache-and-network';
