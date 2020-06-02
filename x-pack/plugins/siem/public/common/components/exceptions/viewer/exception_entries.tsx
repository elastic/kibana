/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBasicTable, EuiIconTip, EuiFlexItem, EuiFlexGroup, EuiButton } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled, { css } from 'styled-components';
import { transparentize } from 'polished';

import { AndOrBadge } from '../../and_or_badge';
import { getEmptyValue } from '../helpers';
import * as i18n from '../translations';
import { FormattedEntry } from '../types';

const EntriesDetails = styled(EuiFlexItem)`
  padding: 16px;
`;

const StyledEditButton = styled(EuiButton)`
  ${({ theme }) => css`
    background-color: ${transparentize(0.9, theme.eui.euiColorPrimary)};
    width: 111px;
    border: none;
    font-weight: 600;
  `}
`;

const StyledRemoveButton = styled(EuiButton)`
  ${({ theme }) => css`
    background-color: ${transparentize(0.9, theme.eui.euiColorDanger)};
    width: 111px;
    border: none;
    font-weight: 600;
  `}
`;

const AndOrBadgeContainer = styled(EuiFlexItem)`
  padding-top: 32px;
`;

interface ExceptionEntriesComponentProps {
  entries: FormattedEntry[];
  handleDelete: () => void;
  handleEdit: () => void;
}

const ExceptionEntriesComponent = ({
  entries,
  handleDelete,
  handleEdit,
}: ExceptionEntriesComponentProps) => {
  const columns = useMemo(
    () => [
      {
        field: 'fieldName',
        name: 'Field',
        sortable: false,
        truncateText: true,
        'data-test-subj': 'exceptionFieldNameCell',
        width: '30%',
        render: (value: string | null, data: FormattedEntry) => {
          if (value !== null && data.isNested) {
            return (
              <>
                <EuiIconTip type="grabHorizontal" size="m" />
                {value}
              </>
            );
          } else {
            return value ?? getEmptyValue();
          }
        },
      },
      {
        field: 'operator',
        name: 'Operator',
        sortable: false,
        truncateText: true,
        'data-test-subj': 'exceptionFieldOperatorCell',
        width: '20%',
        render: (value: string | null) => value ?? getEmptyValue(),
      },
      {
        field: 'value',
        name: 'Value',
        sortable: false,
        truncateText: true,
        'data-test-subj': 'exceptionFieldValueCell',
        width: '60%',
        render: (values: string | string[] | null) => {
          if (Array.isArray(values)) {
            return (
              <EuiFlexGroup direction="row">
                {values.map((value) => {
                  return <EuiFlexItem grow={1}>{value}</EuiFlexItem>;
                })}
              </EuiFlexGroup>
            );
          } else {
            return values ?? getEmptyValue();
          }
        },
      },
    ],
    [entries]
  );

  return (
    <EntriesDetails grow={5}>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiFlexGroup direction="row" gutterSize="none">
            {entries.length > 1 && (
              <AndOrBadgeContainer grow={false}>
                <AndOrBadge type="and" includeAntenas />
              </AndOrBadgeContainer>
            )}
            <EuiFlexItem grow={1}>
              <EuiBasicTable isSelectable={false} itemId="id" columns={columns} items={entries} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <StyledEditButton size="s" color="primary" onClick={handleEdit}>
                {i18n.EDIT}
              </StyledEditButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <StyledRemoveButton size="s" color="danger" onClick={() => handleDelete()}>
                {i18n.REMOVE}
              </StyledRemoveButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EntriesDetails>
  );
};

ExceptionEntriesComponent.displayName = 'ExceptionEntriesComponent';

export const ExceptionEntries = React.memo(ExceptionEntriesComponent);

ExceptionEntries.displayName = 'ExceptionEntries';
