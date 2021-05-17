/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntryList, entriesList } from '@kbn/securitysolution-io-ts-list-types';
import { createSetToFilterAgainst } from './create_set_to_filter_against';
import { CreateFieldAndSetTuplesOptions, FieldSet } from './types';

export const createFieldAndSetTuples = async <T>({
  events,
  exceptionItem,
  listClient,
  logger,
  buildRuleMessage,
}: CreateFieldAndSetTuplesOptions<T>): Promise<FieldSet[]> => {
  const typedEntries = exceptionItem.entries.filter((entry): entry is EntryList =>
    entriesList.is(entry)
  );
  const fieldAndSetTuples = await Promise.all(
    typedEntries.map(async (entry) => {
      const { list, field, operator } = entry;
      const { id, type } = list;
      const matchedSet = await createSetToFilterAgainst({
        events,
        field,
        listId: id,
        listType: type,
        listClient,
        logger,
        buildRuleMessage,
      });

      return { field, operator, matchedSet };
    })
  );
  return fieldAndSetTuples;
};
