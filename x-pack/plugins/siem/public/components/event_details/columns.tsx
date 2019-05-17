/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiToolTip } from '@elastic/eui';
import * as React from 'react';
import styled from 'styled-components';

import { DefaultDraggable } from '../draggables';
import { DetailItem, ToStringArray } from '../../graphql/types';
import { FormattedFieldValue } from '../timeline/body/renderers/formatted_field';
import { getIconFromType, getExampleText } from './helpers';
import { SelectableText } from '../selectable_text';
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

export const getColumns = (eventId: string) => [
  {
    field: 'type',
    name: '',
    sortable: false,
    truncateText: false,
    width: '30px',
    render: (type: string) => (
      <EuiToolTip content={type}>
        <EuiIcon type={getIconFromType(type)} />
      </EuiToolTip>
    ),
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
              <WithCopyToClipboard text={field} titleSummary={i18n.FIELD} />
            </EuiToolTip>
          </HoverActionsContainer>
        }
        render={() => <span>{field}</span>}
      />
    ),
  },
  {
    field: 'values',
    name: i18n.VALUE,
    sortable: true,
    truncateText: false,
    render: (values: ToStringArray | null | undefined, data: DetailItem) => (
      <EuiFlexGroup direction="column" alignItems="flexStart" component="span" gutterSize="none">
        {values != null &&
          values.map((value, i) => (
            <EuiFlexItem
              grow={false}
              component="span"
              key={`${eventId}-${data.field}-${i}-${value}`}
            >
              <WithHoverActions
                hoverContent={
                  <HoverActionsContainer data-test-subj="hover-actions-container">
                    <EuiToolTip content={i18n.COPY_TO_CLIPBOARD}>
                      <WithCopyToClipboard text={value} titleSummary={i18n.VALUE} />
                    </EuiToolTip>
                  </HoverActionsContainer>
                }
                render={() => (
                  <DefaultDraggable
                    data-test-subj="ip"
                    field={data.field}
                    id={`event-details-field-value-${eventId}-${data.field}-${i}-${value}`}
                    tooltipContent={data.field}
                    value={value}
                  >
                    <FormattedFieldValue
                      contextId={'event-details-field-value'}
                      eventId={eventId}
                      fieldName={data.field}
                      fieldType={data.type}
                      value={value}
                    />
                  </DefaultDraggable>
                )}
              />
            </EuiFlexItem>
          ))}
      </EuiFlexGroup>
    ),
  },
  {
    field: 'description',
    name: i18n.DESCRIPTION,
    render: (description: string | null | undefined, data: DetailItem) => (
      <SelectableText>{`${description || ''} ${getExampleText(data)}`}</SelectableText>
    ),
    sortable: true,
    truncateText: true,
    width: '50%',
  },
];
