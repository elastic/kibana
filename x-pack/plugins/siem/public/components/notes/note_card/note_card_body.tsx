/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiToolTip } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { WithCopyToClipboard } from '../../../lib/clipboard/with_copy_to_clipboard';
import { Markdown } from '../../markdown';
import { WithHoverActions } from '../../with_hover_actions';
import * as i18n from '../translations';

const BodyContainer = styled(EuiPanel)`
  border: none;
`;

const HoverActionsContainer = styled(EuiPanel)`
  align-items: center;
  display: flex;
  flex-direction: row;
  height: 25px;
  justify-content: center;
  left: 5px;
  position: absolute;
  top: -5px;
  width: 30px;
`;

export const NoteCardBody = pure<{ rawNote: string }>(({ rawNote }) => (
  <BodyContainer data-test-subj="note-card-body" hasShadow={false} paddingSize="s">
    <WithHoverActions
      hoverContent={
        <HoverActionsContainer data-test-subj="hover-actions-container">
          <EuiToolTip content={i18n.COPY_TO_CLIPBOARD}>
            <WithCopyToClipboard text={rawNote} titleSummary={i18n.NOTE(1)} />
          </EuiToolTip>
        </HoverActionsContainer>
      }
      render={() => <Markdown raw={rawNote} />}
    />
  </BodyContainer>
));
