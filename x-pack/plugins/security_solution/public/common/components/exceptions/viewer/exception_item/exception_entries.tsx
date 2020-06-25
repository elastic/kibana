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
  EuiHideFor,
  EuiBadge,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import styled, { css } from 'styled-components';
import { transparentize } from 'polished';

import { AndOrBadge } from '../../../and_or_badge';
import { getEmptyValue } from '../../../empty_value';
import * as i18n from '../../translations';
import { FormattedEntry } from '../../types';

const MyEntriesDetails = styled(EuiFlexItem)`
  padding: ${({ theme }) => theme.eui.euiSize};
`;

const MyEditButton = styled(EuiButton)`
  ${({ theme }) => css`
    background-color: ${transparentize(0.9, theme.eui.euiColorPrimary)};
    border: none;
    font-weight: ${theme.eui.euiFontWeightSemiBold};
  `}
`;

const MyRemoveButton = styled(EuiButton)`
  ${({ theme }) => css`
    background-color: ${transparentize(0.9, theme.eui.euiColorDanger)};
    border: none;
    font-weight: ${theme.eui.euiFontWeightSemiBold};
  `}
`;

const MyAndOrBadgeContainer = styled(EuiFlexItem)`
  padding-top: ${({ theme }) => theme.eui.euiSizeXL};
  padding-bottom: ${({ theme }) => theme.eui.euiSizeS};
`;

const MyActionButton = styled(EuiFlexItem)`
  align-self: flex-end;
`;

interface ExceptionEntriesComponentProps {
  entries: FormattedEntry[];
  disableDelete: boolean;
  onDelete: () => void;
  onEdit: () => void;
}

const ExceptionEntriesComponent = ({
  entries,
  disableDelete,
  onDelete,
  onEdit,
}: ExceptionEntriesComponentProps): JSX.Element => {
  const columns = useMemo(
    (): Array<EuiTableFieldDataColumnType<FormattedEntry>> => [
      {
        field: 'fieldName',
        name: 'Field',
        sortable: false,
        truncateText: true,
        textOnly: true,
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
              <EuiFlexGroup gutterSize="xs" direction="row" justifyContent="flexStart">
                {values.map((value) => {
                  return (
                    <EuiFlexItem key={value} grow={false}>
                      <EuiBadge color="#DDD">{value}</EuiBadge>
                    </EuiFlexItem>
                  );
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
    <MyEntriesDetails grow={5}>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" gutterSize="none">
            {entries.length > 1 && (
              <EuiHideFor sizes={['xs', 's']}>
                <MyAndOrBadgeContainer grow={false}>
                  <AndOrBadge
                    type="and"
                    includeAntennas
                    data-test-subj="exceptionsViewerAndBadge"
                  />
                </MyAndOrBadgeContainer>
              </EuiHideFor>
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
        <EuiFlexItem grow={1}>
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
            <MyActionButton grow={false}>
              <MyEditButton
                size="s"
                color="primary"
                onClick={onEdit}
                isDisabled={disableDelete}
                data-test-subj="exceptionsViewerEditBtn"
              >
                {i18n.EDIT}
              </MyEditButton>
            </MyActionButton>
            <MyActionButton grow={false}>
              <MyRemoveButton
                size="s"
                color="danger"
                onClick={onDelete}
                isLoading={disableDelete}
                data-test-subj="exceptionsViewerDeleteBtn"
              >
                {i18n.REMOVE}
              </MyRemoveButton>
            </MyActionButton>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </MyEntriesDetails>
  );
};

ExceptionEntriesComponent.displayName = 'ExceptionEntriesComponent';

export const ExceptionEntries = React.memo(ExceptionEntriesComponent);

ExceptionEntries.displayName = 'ExceptionEntries';
