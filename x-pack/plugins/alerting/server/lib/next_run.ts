/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { parseDuration } from '../../common';

export const getNextRunDate = (interval: string) => moment().add(parseDuration(interval), 'ms');

export const getNextRunString = (interval: string) => getNextRunDate(interval).toISOString();
