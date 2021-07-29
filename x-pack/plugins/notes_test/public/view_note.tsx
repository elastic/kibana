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

import type { SimpleSavedObject } from 'src/core/public';
import type { NoteAttributes } from '../common';
import type { Services } from './services';

interface Params {
  noteId: string;
}
interface Props {
  services: Services;
}

type NoteObject = SimpleSavedObject<NoteAttributes>;

export function ViewNote({ services }: Props) {
  const { noteId } = useParams<Params>();
  const [note, setNote] = useState<NoteObject | null>(null);

  const fetchNote = async () => {
    const savedObject = await services.getNoteById(noteId);

    setNote(savedObject);
  };

  useEffect(() => {
    fetchNote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageContent>
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
