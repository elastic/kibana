/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FrameworkRequest } from '../framework';
import { NoteSavedObject } from '../../../common/types/timeline/note';
import { SavedObjectsFindOptions } from '../../../../../../src/core/server';
import { getAllSavedNotes } from './get_all_saved_notes';
import { noteSavedObjectType } from './saved_object_mappings';

export const getNotesByTimelineId = async (
  request: FrameworkRequest,
  timelineId: string
): Promise<NoteSavedObject[]> => {
  const options: SavedObjectsFindOptions = {
    type: noteSavedObjectType,
    search: timelineId,
    searchFields: ['timelineId'],
  };
  const notesByTimelineId = await getAllSavedNotes(request, options);
  return notesByTimelineId.notes;
};
