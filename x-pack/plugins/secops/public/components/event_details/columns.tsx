/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiIcon,
  // @ts-ignore
  EuiInMemoryTable,
  EuiPanel,
  EuiToolTip,
} from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import { WithCopyToClipboard } from '../../lib/clipboard/with_copy_to_clipboard';
import { WithHoverActions } from '../with_hover_actions';
import { getIconFromType } from './helpers';
import * as i18n from './translations';

/**
 * An item rendered in the table
 */
interface Item {
  field: string;
  description: string;
  type: string;
  value: JSX.Element;
  valueAsString: string;
}

const SelectableText = styled.span`
  user-select: text;
`;

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

export const columns = [
  {
    field: 'type',
    name: '',
    sortable: false,
    truncateText: false,
    width: '30px',
    render: (type: string) => <EuiIcon type={getIconFromType(type)} />,
  },
  {
    field: 'field',
    name: i18n.FIELD,
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
    field: 'value',
    name: i18n.VALUE,
    sortable: true,
    truncateText: false,
    render: (value: JSX.Element, item: Item) => (
      <WithHoverActions
        hoverContent={
          <HoverActionsContainer data-test-subj="hover-actions-container">
            <EuiToolTip content={i18n.COPY_TO_CLIPBOARD}>
              <WithCopyToClipboard text={item.valueAsString} />
            </EuiToolTip>
          </HoverActionsContainer>
        }
      >
        {value}
      </WithHoverActions>
    ),
  },
  {
    field: 'description',
    name: i18n.DESCRIPTION,
    render: (description: string) => <SelectableText>{description}</SelectableText>,
    sortable: true,
    truncateText: true,
    width: '50%',
  },
];
