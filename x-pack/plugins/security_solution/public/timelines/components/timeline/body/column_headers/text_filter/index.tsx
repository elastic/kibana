/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFieldText } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React from 'react';
import styled from 'styled-components';

import { OnFilterChange } from '../../../events';
import { ColumnId } from '../../column_id';

interface Props {
  columnId: ColumnId;
  filter?: string;
  minWidth: number;
  onFilterChange?: OnFilterChange;
  placeholder?: string;
}

export const DEFAULT_PLACEHOLDER = 'Filter';

const FieldText = styled(EuiFieldText)<{ minwidth: string }>`
  min-width: ${(props) => props.minwidth};
`;

FieldText.displayName = 'FieldText';

/** Renders a text-based column filter */
export const TextFilter = React.memo<Props>(
  ({
    columnId,
    minWidth,
    filter = '',
    onFilterChange = noop,
    placeholder = DEFAULT_PLACEHOLDER,
  }) => {
    const onChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
      onFilterChange({ columnId, filter: event.target.value });
    };

    return (
      <FieldText
        data-test-subj="textFilter"
        minwidth={`${minWidth}px`}
        placeholder={placeholder}
        value={filter}
        onChange={onChange}
      />
    );
  }
);

TextFilter.displayName = 'TextFilter';
