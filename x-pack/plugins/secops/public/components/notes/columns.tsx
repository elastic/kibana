/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiToolTip } from '@elastic/eui';
import moment from 'moment';
import * as React from 'react';
import styled from 'styled-components';

import { WithCopyToClipboard } from '../../lib/clipboard/with_copy_to_clipboard';
import { WithHoverActions } from '../with_hover_actions';

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
    name: 'Date',
    sortable: false,
    truncateText: false,
    render: (date: string) => <SelectableText>{moment(date).fromNow()}</SelectableText>,
  },
  {
    field: 'user',
    name: 'User',
    sortable: true,
    truncateText: false,
    render: (field: string) => (
      <WithHoverActions
        hoverContent={
          <HoverActionsContainer data-test-subj="hover-actions-container">
            <EuiToolTip content="Copy to clipboard">
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
    name: 'Note',
    sortable: true,
    truncateText: false,
    render: (note: string) => (
      <WithHoverActions
        hoverContent={
          <HoverActionsContainer data-test-subj="hover-actions-container">
            <EuiToolTip content="Copy to clipboard">
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
