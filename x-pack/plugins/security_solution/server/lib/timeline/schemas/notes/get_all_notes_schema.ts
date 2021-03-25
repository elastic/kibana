/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { pageInfoNoteRt, sortNoteRt } from '../../../../../common/types/timeline/note';

export const getAllNotesSchema = rt.partial({
  pageInfo: pageInfoNoteRt,
  search: rt.string,
  sort: sortNoteRt,
});

export const getNotesSchema = rt.partial({
  timelineId: rt.string,
  eventId: rt.string,
});
