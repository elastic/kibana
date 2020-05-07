/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Type } from '../../../common/schemas';

export type QueryFilterType = Array<
  { term: { list_id: string } } | { terms: { ip: string[] } } | { terms: { keyword: string[] } }
>;

export const getQueryFilterFromTypeValue = ({
  type,
  value,
  listId,
}: {
  type: Type;
  value: string[];
  listId: string;
  // We disable the consistent return since we want to use typescript for exhaustive type checks
  // eslint-disable-next-line consistent-return
}): QueryFilterType => {
  const filter: QueryFilterType = [{ term: { list_id: listId } }];
  switch (type) {
    case 'ip': {
      return [...filter, ...[{ terms: { ip: value } }]];
    }
    case 'keyword': {
      return [...filter, ...[{ terms: { keyword: value } }]];
    }
  }
};
