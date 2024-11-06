/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { fetchNotesByDocumentIds } from '../store/notes.slice';

export interface UseFetchNotesResult {
  /**
   * Function to fetch the notes for an array of documents
   */
  onLoad: (events: Array<Partial<{ _id: string }>>) => void;
}

/**
 * Hook that returns a function to fetch the notes for an array of documents
 */
export const useFetchNotes = (): UseFetchNotesResult => {
  const dispatch = useDispatch();
  const securitySolutionNotesEnabled = useIsExperimentalFeatureEnabled(
    'securitySolutionNotesEnabled'
  );
  const onLoad = useCallback(
    (events: Array<Partial<{ _id: string }>>) => {
      if (!securitySolutionNotesEnabled || events.length === 0) return;

      const eventIds: string[] = events
        .map((event) => event._id)
        .filter((id) => id != null) as string[];
      dispatch(fetchNotesByDocumentIds({ documentIds: eventIds }));
    },
    [dispatch, securitySolutionNotesEnabled]
  );

  return { onLoad };
};
