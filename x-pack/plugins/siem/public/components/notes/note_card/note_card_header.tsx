/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAvatar, EuiPanel } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import * as i18n from '../translations';

import { NoteCreated } from './note_created';

const Action = styled.span`
  margin-right: 5px;
`;

const Avatar = styled(EuiAvatar)`
  margin-right: 5px;
`;

const HeaderContainer = styled.div`
  align-items: center;
  display: flex;
  user-select: none;
`;

const User = styled.span`
  font-weight: 700;
  margin: 5px;
`;

export const NoteCardHeader = pure<{ created: Date; user: string }>(({ created, user }) => (
  <EuiPanel data-test-subj="note-card-header" hasShadow={false} paddingSize="s">
    <HeaderContainer>
      <Avatar data-test-subj="avatar" size="s" name={user} />
      <User data-test-subj="user">{user}</User>
      <Action data-test-subj="action">{i18n.ADDED_A_NOTE}</Action>
      <NoteCreated data-test-subj="created" created={created} />
    </HeaderContainer>
  </EuiPanel>
));
