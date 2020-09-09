/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export * from '../../../common/types/workplace_search';

export type TSpacerSize = 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl';

export interface ISourcePriority {
  [id: string]: number;
}
