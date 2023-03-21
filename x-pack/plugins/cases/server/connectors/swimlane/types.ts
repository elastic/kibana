/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SwimlaneFieldsType } from '../../../common/api';
import type { ICasesConnector } from '../types';

export type SwimlaneCaseConnector = ICasesConnector<SwimlaneFieldsType>;
export type Format = ICasesConnector<SwimlaneFieldsType>['format'];
export type GetMapping = ICasesConnector<SwimlaneFieldsType>['getMapping'];
