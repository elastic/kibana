/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiInMemoryTable,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { Link } from 'react-router-dom';

import type { SimpleSavedObject } from 'src/core/public';
import type { NoteAttributes } from '../common';
import { VIEW_NOTE_PATH } from '../common';
import { CreateNoteForm } from './create_note_form';
import type { Services } from './services';

interface Props {
  services: Services;
}

type NoteObject = SimpleSavedObject<NoteAttributes>;

export function NotesList({ services }: Props) {
  const { findAllNotes } = services;
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [notes, setNotes] = useState<NoteObject[]>([]);

  const fetchNotes = useCallback(async () => {
    if (isFetching) return;
    setIsFetching(true);

    const response = await findAllNotes();
    setNotes(response);

    setIsFetching(false);
  }, [isFetching, findAllNotes, setNotes]);

  useEffect(() => {
    fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageContent>
          <EuiPageContentHeader>
            <EuiText>
              <h1>Notes</h1>
            </EuiText>
          </EuiPageContentHeader>
          {notes.length ? (
            <>
              <EuiInMemoryTable<NoteObject>
                items={notes}
                columns={[
                  {
                    field: 'attributes.subject',
                    name: 'Subject',
                    render: (value, record) => {
                      const { id, attributes } = record;
                      return <Link to={`${VIEW_NOTE_PATH}/${id}`}>{attributes.subject}</Link>;
                    },
                  },
                  {
                    field: 'attributes.createdAt',
                    name: 'Created at',
                    dataType: 'date',
                  },
                ]}
                pagination={false}
                sorting={{ sort: { field: 'attributes.createdAt', direction: 'desc' } }}
              />
              <EuiSpacer />
            </>
          ) : null}
          <CreateNoteForm services={services} onAfterCreate={() => fetchNotes()} />
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}
