/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { NoteCardBody } from './note_card_body';
import { NoteCardHeader } from './note_card_header';

const NoteCardContainer = styled(EuiPanel)`
  width: 100%;
`;

export const NoteCard = pure<{ created: Date; rawNote: string; user: string }>(
  ({ created, rawNote, user }) => (
    <NoteCardContainer data-test-subj="note-card" hasShadow={false} paddingSize="none">
      <NoteCardHeader created={created} user={user} />
      <NoteCardBody rawNote={rawNote} />
    </NoteCardContainer>
  )
);
