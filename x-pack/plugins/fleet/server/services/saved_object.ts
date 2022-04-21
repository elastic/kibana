/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, SavedObjectsFindResponse } from '@kbn/core/server';

import { SO_SEARCH_LIMIT } from '../constants';
import type { ListWithKuery } from '../types';

/**
 * Escape a value with double quote to use with saved object search
 * Example: escapeSearchQueryPhrase('-test"toto') => '"-test\"toto""'
 * @param val
 */
export function escapeSearchQueryPhrase(val: string): string {
  return `"${val.replace(/["]/g, '"')}"`;
}

// Adds `.attributes` to any kuery strings that are missing it, this comes from
// internal SO structure. Kuery strings that come from UI will typically have
// `.attributes` hidden to simplify UX, so this normalizes any kuery string for
// filtering SOs
export const normalizeKuery = (savedObjectType: string, kuery: string): string => {
  return kuery.replace(
    new RegExp(`${savedObjectType}\.(?!attributes\.)`, 'g'),
    `${savedObjectType}.attributes.`
  );
};

// Like saved object client `.find()`, but ignores `page` and `perPage` parameters and
// returns *all* matching saved objects by collocating results from all `.find` pages.
// This function actually doesn't offer any additional benefits over `.find()` for now
// due to SO client limitations (see comments below), so is a placeholder for when SO
// client is improved.
export const findAllSOs = async <T = unknown>(
  soClient: SavedObjectsClientContract,
  options: Omit<ListWithKuery, 'page' | 'perPage'> & {
    type: string;
  }
): Promise<Pick<SavedObjectsFindResponse<T>, 'saved_objects' | 'total'>> => {
  const { type, sortField, sortOrder, kuery } = options;
  let savedObjectResults: SavedObjectsFindResponse<T>['saved_objects'] = [];

  const query = {
    type,
    sortField,
    sortOrder,
    filter: kuery,
    page: 1,
    perPage: SO_SEARCH_LIMIT,
  };

  const { saved_objects: initialSOs, total } = await soClient.find<T>(query);

  savedObjectResults = initialSOs;

  // The saved object client can't actually page through more than the first 10,000
  // results, due to the same `index.max_result_window` constraint. The commented out
  // code below is an example of paging through rest of results when the SO client
  // offers that kind of support.
  // if (total > searchLimit) {
  //   const remainingPages = Math.ceil((total - searchLimit) / searchLimit);
  //   for (let currentPage = 2; currentPage <= remainingPages + 1; currentPage++) {
  //     const { saved_objects: currentPageSavedObjects } = await soClient.find<T>({
  //       ...query,
  //       page: currentPage,
  //     });
  //     if (currentPageSavedObjects.length) {
  //       savedObjectResults = savedObjectResults.concat(currentPageSavedObjects);
  //     }
  //   }
  // }

  return {
    saved_objects: savedObjectResults,
    total,
  };
};
