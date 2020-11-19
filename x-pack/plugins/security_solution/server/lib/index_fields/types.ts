/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FrameworkRequest } from '../framework';
import { IFieldSubType } from '../../../../../../src/plugins/data/common';

export interface FieldsAdapter {
  getIndexFields(req: FrameworkRequest, indices: string[]): Promise<string[]>;
}

export interface IndexFieldDescriptor {
  name: string;
  type: string;
  searchable: boolean;
  aggregatable: boolean;
  esTypes?: string[];
  subType?: IFieldSubType;
}
