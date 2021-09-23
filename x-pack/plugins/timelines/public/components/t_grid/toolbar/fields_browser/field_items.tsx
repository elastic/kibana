/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCheckbox,
  EuiIcon,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { uniqBy } from 'lodash/fp';
import styled from 'styled-components';

import { getEmptyValue } from '../../../empty_value';
import { getExampleText, getIconFromType } from '../../../utils/helpers';
import type { ColumnHeaderOptions, BrowserField } from '../../../../../common';
import { defaultColumnHeaderType } from '../../body/column_headers/default_headers';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../body/constants';
import { TruncatableText } from '../../../truncatable_text';
import { FieldName } from './field_name';
import * as i18n from './translations';
import { getAlertColumnHeader } from './helpers';

const TypeIcon = styled(EuiIcon)`
  margin: 0 4px;
  position: relative;
  top: -1px;
`;

TypeIcon.displayName = 'TypeIcon';

export const Description = styled.span`
  user-select: text;
  width: 400px;
`;

Description.displayName = 'Description';

/**
 * An item rendered in the table
 */
export interface FieldItem {
  ariaRowindex?: number;
  checkbox: React.ReactNode;
  description: React.ReactNode;
  field: React.ReactNode;
  fieldId: string;
}

/**
 * Returns the fields items, values, and descriptions shown when a user expands an event
 */
export const getFieldItems = ({
  category,
  columnHeaders,
  highlight = '',
  timelineId,
  toggleColumn,
}: {
  category: Partial<BrowserField>;
  columnHeaders: ColumnHeaderOptions[];
  highlight?: string;
  timelineId: string;
  toggleColumn: (column: ColumnHeaderOptions) => void;
}): FieldItem[] =>
  uniqBy('name', [
    ...Object.values(category != null && category.fields != null ? category.fields : {}),
  ]).map((field) => ({
    checkbox: (
      <EuiToolTip content={i18n.VIEW_COLUMN(field.name ?? '')}>
        <EuiCheckbox
          aria-label={i18n.VIEW_COLUMN(field.name ?? '')}
          checked={columnHeaders.findIndex((c) => c.id === field.name) !== -1}
          data-test-subj={`field-${field.name}-checkbox`}
          data-colindex={1}
          id={field.name ?? ''}
          onChange={() =>
            toggleColumn({
              columnHeaderType: defaultColumnHeaderType,
              id: field.name ?? '',
              initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
              ...getAlertColumnHeader(timelineId, field.name ?? ''),
            })
          }
        />
      </EuiToolTip>
    ),
    field: (
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiToolTip content={field.type}>
            <TypeIcon
              data-test-subj={`field-${field.name}-icon`}
              type={getIconFromType(field.type ?? null)}
            />
          </EuiToolTip>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <FieldName data-test-subj="field-name" fieldId={field.name ?? ''} highlight={highlight} />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    description: (
      <div data-colindex={3} tabIndex={0}>
        <EuiToolTip content={field.description}>
          <>
            <EuiScreenReaderOnly data-test-subj="descriptionForScreenReaderOnly">
              <p>{i18n.DESCRIPTION_FOR_FIELD(field.name ?? '')}</p>
            </EuiScreenReaderOnly>
            <TruncatableText>
              <Description data-test-subj={`field-${field.name}-description`}>
                {`${field.description ?? getEmptyValue()} ${getExampleText(field.example)}`}
              </Description>
            </TruncatableText>
          </>
        </EuiToolTip>
      </div>
    ),
    fieldId: field.name ?? '',
  }));

/**
 * Returns a table column template provided to the `EuiInMemoryTable`'s
 * `columns` prop
 */
export const getFieldColumns = () => [
  {
    field: 'checkbox',
    name: '',
    render: (checkbox: React.ReactNode, _: FieldItem) => checkbox,
    sortable: false,
    width: '25px',
  },
  {
    field: 'field',
    name: i18n.FIELD,
    render: (field: React.ReactNode, _: FieldItem) => field,
    sortable: false,
    width: '225px',
  },
  {
    field: 'description',
    name: i18n.DESCRIPTION,
    render: (description: React.ReactNode, _: FieldItem) => description,
    sortable: false,
    truncateText: true,
    width: '400px',
  },
];
