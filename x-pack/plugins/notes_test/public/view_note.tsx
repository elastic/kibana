/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiLoadingSpinner,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { Link, useParams } from 'react-router-dom';

import type { HttpStart, ResolvedSimpleSavedObject } from 'src/core/public';
import type { SpacesPluginStart } from '../../spaces/public';
import type { NoteAttributes } from '../common';
import { VIEW_NOTE_PATH } from '../common';
import type { Services } from './services';

interface Params {
  noteId: string;
}
interface Props {
  services: Services;
  http: HttpStart;
  spacesApi?: SpacesPluginStart;
}

type ResolvedNote = ResolvedSimpleSavedObject<NoteAttributes>;
const OBJECT_NOUN = 'note';

export function ViewNote({ services, http, spacesApi }: Props) {
  const { noteId } = useParams<Params>();
  const [resolvedNote, setResolvedNote] = useState<ResolvedNote | null>(null);
  const note = resolvedNote?.saved_object;

  const fetchNote = async () => {
    const resolveResult = await services.getNoteById(noteId);

    if (spacesApi && resolveResult.outcome === 'aliasMatch') {
      // We found this object by a legacy URL alias from its old ID; redirect the user to the page with its new ID, preserving any URL hash
      const newObjectId = resolveResult.alias_target_id!; // This is always defined if outcome === 'aliasMatch'
      const newPath = `/${VIEW_NOTE_PATH}/${newObjectId}${window.location.hash}`; // Use the *local* path within this app (do not include the "/app/appId" prefix)
      await spacesApi.ui.redirectLegacyUrl(newPath, OBJECT_NOUN);
      return;
    }

    setResolvedNote(resolveResult);
  };

  useEffect(() => {
    fetchNote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  const getLegacyUrlConflictCallout = () => {
    // This function returns a callout component *if* we have encountered a "legacy URL conflict" scenario
    if (spacesApi && resolvedNote) {
      if (resolvedNote.outcome === 'conflict') {
        // We have resolved to one object, but another object has a legacy URL alias associated with this ID/page. We should display a
        // callout with a warning for the user, and provide a way for them to navigate to the other object.
        const currentObjectId = resolvedNote.saved_object.id;
        const otherObjectId = resolvedNote.alias_target_id!; // This is always defined if outcome === 'conflict'
        const otherObjectPath = `/${VIEW_NOTE_PATH}/${otherObjectId}${window.location.hash}`; // Use the *local* path within this app (do not include the "/app/appId" prefix)
        return (
          <>
            {spacesApi.ui.components.getLegacyUrlConflict({
              objectNoun: OBJECT_NOUN,
              currentObjectId,
              otherObjectId,
              otherObjectPath,
            })}
            <EuiSpacer />
          </>
        );
      }
    }
    return null;
  };

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageContent>
          {/* If we have a legacy URL conflict callout to display, show it at the top of the page */}
          {getLegacyUrlConflictCallout()}
          <EuiPageContentHeader>
            <EuiText>
              <h1>View note</h1>
            </EuiText>
          </EuiPageContentHeader>
          {note ? (
            <>
              <EuiText>
                <h2>{note.attributes.subject}</h2>
                <p>{note.attributes.createdAt}</p>
                <pre>
                  <code>{note.attributes.text}</code>
                </pre>
              </EuiText>
              <EuiSpacer />
            </>
          ) : (
            <EuiLoadingSpinner />
          )}
          <Link to="/">Back to notes list</Link>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}
