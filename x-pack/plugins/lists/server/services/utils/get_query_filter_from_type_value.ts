/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Type } from '../../../common/schemas';

export type QueryFilterType = [
  { term: Record<string, string> },
  { terms: Record<string, string[]> }
];

export const getQueryFilterFromTypeValue = ({
  type,
  value,
  listId,
}: {
  type: Type;
  value: string[];
  listId: string;
}): QueryFilterType => [{ term: { list_id: listId } }, { terms: { [type]: value } }];
