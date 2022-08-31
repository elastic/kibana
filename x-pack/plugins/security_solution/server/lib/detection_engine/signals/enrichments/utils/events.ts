/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { GetEventValue } from '../types';

export const getEventValue: GetEventValue = (event, path) =>
  get(event, `_source.${path}`) || event?._source?.[path];
