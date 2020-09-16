/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { all } from 'deepmerge';
import { IIndexPattern } from '../../../../../../../../src/plugins/data/common';
import { Immutable } from '../../../../../common/endpoint/types';

export function clone(value: IIndexPattern | Immutable<IIndexPattern>): IIndexPattern {
  return all([value]) as IIndexPattern;
}
