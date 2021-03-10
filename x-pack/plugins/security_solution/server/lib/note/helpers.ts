/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { pipe } from 'fp-ts/lib/pipeable';
import { map, fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { failure } from 'io-ts/lib/PathReporter';

import { NoteSavedObject, NoteSavedObjectRuntimeType } from '../../../common/types/timeline/note';

export const convertSavedObjectToSavedNote = (
  savedObject: unknown,
  timelineVersion?: string | undefined | null
): NoteSavedObject =>
  pipe(
    NoteSavedObjectRuntimeType.decode(savedObject),
    map((savedNote) => ({
      noteId: savedNote.id,
      version: savedNote.version,
      timelineVersion,
      ...savedNote.attributes,
    })),
    fold((errors) => {
      throw new Error(failure(errors).join('\n'));
    }, identity)
  );
