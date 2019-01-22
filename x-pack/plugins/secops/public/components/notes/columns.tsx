/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiToolTip } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n/react';
import * as React from 'react';
import styled from 'styled-components';

import { WithCopyToClipboard } from '../../lib/clipboard/with_copy_to_clipboard';
import { WithHoverActions } from '../with_hover_actions';
import * as i18n from './translations';

const HoverActionsContainer = styled(EuiPanel)`
  align-items: center;
  display: flex;
  flex-direction: row;
  height: 25px;
  justify-content: center;
  left: 5px;
  position: absolute;
  top: -10px;
  width: 30px;
`;

const SelectableText = styled.span`
  user-select: text;
`;

export const columns = [
  {
    field: 'created',
    name: i18n.DATE,
    sortable: false,
    truncateText: false,
    render: (date: string) => (
      <SelectableText>
        <FormattedRelative value={new Date(date)} />
      </SelectableText>
    ),
  },
  {
    field: 'user',
    name: i18n.USER,
    sortable: true,
    truncateText: false,
    render: (field: string) => (
      <WithHoverActions
        hoverContent={
          <HoverActionsContainer data-test-subj="hover-actions-container">
            <EuiToolTip content={i18n.COPY_TO_CLIPBOARD}>
              <WithCopyToClipboard text={field} />
            </EuiToolTip>
          </HoverActionsContainer>
        }
      >
        <span>{field}</span>
      </WithHoverActions>
    ),
  },
  {
    field: 'note',
    name: i18n.NOTE,
    sortable: true,
    truncateText: false,
    render: (note: string) => (
      <WithHoverActions
        hoverContent={
          <HoverActionsContainer data-test-subj="hover-actions-container">
            <EuiToolTip content={i18n.COPY_TO_CLIPBOARD}>
              <WithCopyToClipboard text={note} />
            </EuiToolTip>
          </HoverActionsContainer>
        }
      >
        <span>{note}</span>
      </WithHoverActions>
    ),
  },
];
