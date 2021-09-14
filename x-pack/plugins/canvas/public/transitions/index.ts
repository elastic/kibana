/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fade } from './fade';
import { rotate } from './rotate';
import { slide } from './slide';
import { zoom } from './zoom';

export const transitions = [fade, rotate, slide, zoom];
