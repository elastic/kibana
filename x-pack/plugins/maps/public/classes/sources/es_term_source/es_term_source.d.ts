/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IField } from '../../fields/field';
import { IESAggSource } from '../es_agg_source';

export interface IESTermSource extends IESAggSource {
  getTermField(): IField;
  hasCompleteConfig(): boolean;
}
