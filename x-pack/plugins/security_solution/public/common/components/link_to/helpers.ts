/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

//Prefer importing entire lodash library, e.g. import { get } from "lodash"
// eslint-disable-next-line no-restricted-imports
import { isEmpty } from 'lodash/fp';

export const appendSearch = (search?: string) =>
  isEmpty(search) ? '' : `${search?.startsWith('?') ? search : `?${search}`}`;
