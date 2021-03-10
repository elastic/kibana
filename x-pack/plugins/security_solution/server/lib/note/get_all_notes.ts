/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FrameworkRequest } from '../framework';
import { ResponseNotes, SortNote } from '../../graphql/types';
import { SavedObjectsFindOptions } from '../../../../../../src/core/server';
import { getAllSavedNotes } from './get_all_saved_notes';

export const getAllNotes = async (
  request: FrameworkRequest,
  pageInfo: PageInfoNote | null,
  search: string | null,
  sort: SortNote | null
): Promise<ResponseNotes> => {
  const options: SavedObjectsFindOptions = {
    type: noteSavedObjectType,
    perPage: pageInfo != null ? pageInfo.pageSize : undefined,
    page: pageInfo != null ? pageInfo.pageIndex : undefined,
    search: search != null ? search : undefined,
    searchFields: ['note'],
    sortField: sort != null ? sort.sortField : undefined,
    sortOrder: sort != null ? sort.sortOrder : undefined,
  };
  return getAllSavedNotes(request, options);
};
