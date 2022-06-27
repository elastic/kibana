/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiButtonIcon,
  EuiSpacer,
  EuiTableActionsColumnType,
  EuiTableFieldDataColumnType,
  EuiTitle,
  EuiToolTip,
  PropsOf,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import type { Serializable } from '@kbn/utility-types';
import { ColumnNameWithTooltip } from '../../../components/column_name_with_tooltip';
import { CspEvaluationBadge } from '../../../components/csp_evaluation_badge';
import * as TEXT from '../translations';
import { CspFinding } from '../types';
import {
  FINDINGS_TABLE_CELL_ADD_FILTER,
  FINDINGS_TABLE_CELL_ADD_NEGATED_FILTER,
} from '../test_subjects';

export const PageWrapper: React.FC = ({ children }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        padding: ${euiTheme.size.l};
      `}
    >
      {children}
    </div>
  );
};

export const PageTitle: React.FC = ({ children }) => (
  <EuiTitle size="l">
    <div>
      {children}
      <EuiSpacer />
    </div>
  </EuiTitle>
);

export const PageTitleText = ({ title }: { title: React.ReactNode }) => <h2>{title}</h2>;

export const getExpandColumn = <T extends unknown>({
  onClick,
}: {
  onClick(item: T): void;
}): EuiTableActionsColumnType<T> => ({
  width: '40px',
  actions: [
    {
      name: i18n.translate('xpack.csp.expandColumnNameLabel', { defaultMessage: 'Expand' }),
      description: i18n.translate('xpack.csp.expandColumnDescriptionLabel', {
        defaultMessage: 'Expand',
      }),
      type: 'icon',
      icon: 'expand',
      onClick,
    },
  ],
});

export const getFindingsColumns = ({
  onAddFilter,
}: {
  onAddFilter?(key: string, value: Serializable, negate: boolean): void;
} = {}): Array<EuiTableFieldDataColumnType<CspFinding>> =>
  [
    {
      field: 'resource.id',
      name: (
        <ColumnNameWithTooltip
          columnName={TEXT.RESOURCE_ID}
          tooltipContent={i18n.translate(
            'xpack.csp.findings.findingsTable.findingsTableColumn.resourceIdColumnTooltipLabel',
            {
              defaultMessage: 'Custom Elastic Resource ID',
            }
          )}
        />
      ),
      truncateText: true,
      width: '15%',
      sortable: true,
      render: (filename: string) => (
        <EuiToolTip position="top" content={filename}>
          <span>{filename}</span>
        </EuiToolTip>
      ),
    },
    {
      field: 'result.evaluation',
      name: TEXT.RESULT,
      width: '120px',
      sortable: true,
      render: (type: PropsOf<typeof CspEvaluationBadge>['type']) => (
        <CspEvaluationBadge type={type} />
      ),
    },
    {
      field: 'resource.sub_type',
      name: TEXT.RESOURCE_TYPE,
      sortable: true,
      width: '150px',
    },
    {
      field: 'resource.name',
      name: TEXT.RESOURCE_NAME,
      sortable: true,
    },
    {
      field: 'rule.name',
      name: TEXT.RULE,
      sortable: true,
    },
    {
      field: 'rule.section',
      name: TEXT.CIS_SECTION,
      sortable: true,
      truncateText: true,
    },
    {
      field: 'cluster_id',
      name: (
        <ColumnNameWithTooltip
          columnName={TEXT.CLUSTER_ID}
          tooltipContent={i18n.translate(
            'xpack.csp.findings.resourceTable.resourceTableColumn.clusterIdColumnTooltipLabel',
            {
              defaultMessage: 'Kube-System Namespace ID',
            }
          )}
        />
      ),
      truncateText: true,
      sortable: true,
    },
    {
      field: '@timestamp',
      width: '150px',
      name: TEXT.LAST_CHECKED,
      truncateText: true,
      sortable: true,
      render: (timestamp: number) => (
        <EuiToolTip position="top" content={timestamp}>
          <span>{moment(timestamp).fromNow()}</span>
        </EuiToolTip>
      ),
    },
  ].map((column) => (onAddFilter ? createColumnWithFilters(column, { onAddFilter }) : column));

export const createColumnWithFilters = <T extends unknown>(
  column: EuiTableFieldDataColumnType<T>,
  { onAddFilter }: { onAddFilter(key: string, value: Serializable, negate: boolean): void }
): EuiTableFieldDataColumnType<T> => ({
  ...column,
  render: (cellValue: Serializable, item: T) => (
    <FilterableCell
      onAddFilter={() => onAddFilter(column.field as string, cellValue, false)}
      onAddNegateFilter={() => onAddFilter(column.field as string, cellValue, true)}
      field={column.field as string}
    >
      {column.render?.(cellValue, item) || getCellValue(cellValue)}
    </FilterableCell>
  ),
});

const getCellValue = (value: unknown) => {
  if (!value) return;
  if (typeof value === 'string' || typeof value === 'number') return value;
};

const FilterableCell: React.FC<{
  onAddFilter(): void;
  onAddNegateFilter(): void;
  field: string;
}> = ({ children, onAddFilter, onAddNegateFilter, field }) => (
  <div
    css={css`
      position: relative;
      width: 100%;
      > div:nth-child(2) {
        opacity: 0;
      }

      &:hover {
        > div:nth-child(2) {
          opacity: 1;
        }
      }
    `}
  >
    <div className="eui-textTruncate">{children}</div>
    <div
      css={css`
        position: absolute;
        right: 0;
        top: 0;
        background: ${euiThemeVars.euiColorEmptyShade};
        display: flex;
      `}
    >
      <EuiButtonIcon
        iconType="plusInCircleFilled"
        onClick={onAddFilter}
        data-test-subj={FINDINGS_TABLE_CELL_ADD_FILTER}
        aria-label={i18n.translate('xpack.csp.findings.findingsTableCell.addFilterButton', {
          defaultMessage: 'Add {field} filter',
          values: { field },
        })}
      />
      <EuiButtonIcon
        iconType="minusInCircleFilled"
        onClick={onAddNegateFilter}
        data-test-subj={FINDINGS_TABLE_CELL_ADD_NEGATED_FILTER}
        aria-label={i18n.translate('xpack.csp.findings.findingsTableCell.addNegateFilterButton', {
          defaultMessage: 'Add {field} negated filter',
          values: { field },
        })}
      />
    </div>
  </div>
);
