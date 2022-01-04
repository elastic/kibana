/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResilientFieldsType } from '../../../common/api';
import { ICasesConnector } from '../types';

export type ResilientCaseConnector = ICasesConnector<ResilientFieldsType>;
export type Format = ICasesConnector<ResilientFieldsType>['format'];
export type GetMapping = ICasesConnector<ResilientFieldsType>['getMapping'];
