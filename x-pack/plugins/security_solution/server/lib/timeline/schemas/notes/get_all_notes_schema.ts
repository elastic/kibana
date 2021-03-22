/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { Direction } from '../../../../../common/search_strategy/common';
import { SortFieldNote } from '../../../../../common/types/timeline/note';

export const pageInfoNoteRt = rt.type({
  pageIndex: rt.number,
  pageSize: rt.number,
});

const sortNoteRt = rt.type({
  sortField: rt.union([rt.literal(SortFieldNote.updatedBy), rt.literal(SortFieldNote.updated)]),
  sortOrder: rt.union([rt.literal(Direction.asc), rt.literal(Direction.desc)]),
});

export const getAllNotesSchema = rt.partial({
  pageInfo: pageInfoNoteRt,
  search: rt.string,
  sort: sortNoteRt,
});
