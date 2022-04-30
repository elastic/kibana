/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { functions as commonFunctions } from '../common';
import { location } from './location';
import { markdown } from './markdown';
import { urlparam } from './urlparam';
import { escount } from './escount';
import { esdocs } from './esdocs';
import { essql } from './essql';

export const functions = [location, markdown, urlparam, escount, esdocs, essql, ...commonFunctions];
