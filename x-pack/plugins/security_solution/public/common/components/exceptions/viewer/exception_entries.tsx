/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTable,
  EuiIconTip,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButton,
  EuiTableFieldDataColumnType,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import styled, { css } from 'styled-components';
import { transparentize } from 'polished';

import { AndOrBadge } from '../../and_or_badge';
import { getEmptyValue } from '../../empty_value';
import * as i18n from '../translations';
import { FormattedEntry } from '../types';

const EntriesDetails = styled(EuiFlexItem)`
  padding: ${({ theme }) => theme.eui.euiSize};
`;

const StyledEditButton = styled(EuiButton)`
  ${({ theme }) => css`
    background-color: ${transparentize(0.9, theme.eui.euiColorPrimary)};
    border: none;
    font-weight: ${theme.eui.euiFontWeightSemiBold};
  `}
`;

const StyledRemoveButton = styled(EuiButton)`
  ${({ theme }) => css`
    background-color: ${transparentize(0.9, theme.eui.euiColorDanger)};
    border: none;
    font-weight: ${theme.eui.euiFontWeightSemiBold};
  `}
`;

const AndOrBadgeContainer = styled(EuiFlexItem)`
  padding-top: ${({ theme }) => theme.eui.euiSizeXL};
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
}: ExceptionEntriesComponentProps): JSX.Element => {
  const columns = useMemo(
    (): Array<EuiTableFieldDataColumnType<FormattedEntry>> => [
      {
        field: 'fieldName',
        name: 'Field',
        sortable: false,
        truncateText: true,
        'data-test-subj': 'exceptionFieldNameCell',
        width: '30%',
        render: (value: string | null, data: FormattedEntry) => {
          if (value != null && data.isNested) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries]
  );

  return (
    <EntriesDetails grow={5}>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiFlexGroup direction="row" gutterSize="none">
            {entries.length > 1 && (
              <AndOrBadgeContainer grow={false}>
                <AndOrBadge type="and" includeAntennas data-test-subj="exceptionsViewerAndBadge" />
              </AndOrBadgeContainer>
            )}
            <EuiFlexItem grow={1}>
              <EuiBasicTable
                isSelectable={false}
                itemId="id"
                columns={columns}
                items={entries}
                responsive
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <StyledEditButton
                size="s"
                color="primary"
                onClick={handleEdit}
                data-test-subj="exceptionsViewerEditBtn"
              >
                {i18n.EDIT}
              </StyledEditButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <StyledRemoveButton
                size="s"
                color="danger"
                onClick={handleDelete}
                data-test-subj="exceptionsViewerDeleteBtn"
              >
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
