/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FetchPolicy } from 'apollo-client';
//Prefer importing entire lodash library, e.g. import { get } from "lodash"
// eslint-disable-next-line no-restricted-imports
import { isString } from 'lodash/fp';

import { ESQuery } from '../../../common/typed_json';

export const createFilter = (filterQuery: ESQuery | string | undefined) =>
  isString(filterQuery) ? filterQuery : JSON.stringify(filterQuery);

export const getDefaultFetchPolicy = (): FetchPolicy => 'cache-and-network';
