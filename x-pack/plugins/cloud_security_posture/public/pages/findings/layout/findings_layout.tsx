/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiBottomBar,
  EuiButtonIcon,
  EuiSpacer,
  EuiTableActionsColumnType,
  EuiTableFieldDataColumnType,
  EuiText,
  EuiTitle,
  EuiToolTip,
  PropsOf,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import type { Serializable } from '@kbn/utility-types';
import { FormattedMessage } from '@kbn/i18n-react';
import { MAX_FINDINGS_TO_LOAD } from '../../../common/constants';
import { TimestampTableCell } from '../../../components/timestamp_table_cell';
import { ColumnNameWithTooltip } from '../../../components/column_name_with_tooltip';
import { CspEvaluationBadge } from '../../../components/csp_evaluation_badge';
import {
  FINDINGS_TABLE_CELL_ADD_FILTER,
  FINDINGS_TABLE_CELL_ADD_NEGATED_FILTER,
} from '../test_subjects';

export type OnAddFilter = <T extends string>(key: T, value: Serializable, negate: boolean) => void;

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

const baseColumns = [
  {
    field: 'resource.id',
    name: (
      <ColumnNameWithTooltip
        columnName={i18n.translate(
          'xpack.csp.findings.findingsTable.findingsTableColumn.resourceIdColumnLabel',
          { defaultMessage: 'Resource ID' }
        )}
        tooltipContent={i18n.translate(
          'xpack.csp.findings.findingsTable.findingsTableColumn.resourceIdColumnTooltipLabel',
          { defaultMessage: 'Custom Elastic Resource ID' }
        )}
      />
    ),
    truncateText: true,
    width: '150px',
    sortable: true,
    render: (filename: string) => (
      <EuiToolTip position="top" content={filename} anchorClassName="eui-textTruncate">
        <span>{filename}</span>
      </EuiToolTip>
    ),
  },
  {
    field: 'result.evaluation',
    name: i18n.translate('xpack.csp.findings.findingsTable.findingsTableColumn.resultColumnLabel', {
      defaultMessage: 'Result',
    }),
    width: '120px',
    sortable: true,
    render: (type: PropsOf<typeof CspEvaluationBadge>['type']) => (
      <CspEvaluationBadge type={type} />
    ),
  },
  {
    field: 'resource.sub_type',
    name: i18n.translate(
      'xpack.csp.findings.findingsTable.findingsTableColumn.resourceTypeColumnLabel',
      { defaultMessage: 'Resource Type' }
    ),
    sortable: true,
    truncateText: true,
    width: '10%',
  },
  {
    field: 'resource.name',
    name: i18n.translate(
      'xpack.csp.findings.findingsTable.findingsTableColumn.resourceNameColumnLabel',
      { defaultMessage: 'Resource Name' }
    ),
    sortable: true,
    truncateText: true,
    render: (name: string) => (
      <EuiToolTip content={name} position="left" anchorClassName="eui-textTruncate">
        <>{name}</>
      </EuiToolTip>
    ),
  },
  {
    field: 'rule.name',
    name: i18n.translate('xpack.csp.findings.findingsTable.findingsTableColumn.ruleColumnLabel', {
      defaultMessage: 'Rule',
    }),
    sortable: true,
    render: (name: string) => (
      <EuiToolTip content={name} position="left" anchorClassName="eui-textTruncate">
        <>{name}</>
      </EuiToolTip>
    ),
  },
  {
    field: 'rule.benchmark.name',
    name: i18n.translate(
      'xpack.csp.findings.findingsTable.findingsTableColumn.ruleBenchmarkColumnLabel',
      { defaultMessage: 'Benchmark' }
    ),
    width: '10%',
    sortable: true,
    truncateText: true,
  },
  {
    field: 'rule.section',
    name: i18n.translate(
      'xpack.csp.findings.findingsTable.findingsTableColumn.ruleSectionColumnLabel',
      { defaultMessage: 'CIS Section' }
    ),
    width: '7%',
    sortable: true,
    truncateText: true,
    render: (section: string) => (
      <EuiToolTip content={section} anchorClassName="eui-textTruncate">
        <>{section}</>
      </EuiToolTip>
    ),
  },
  {
    field: 'cluster_id',
    name: (
      <ColumnNameWithTooltip
        columnName={i18n.translate(
          'xpack.csp.findings.findingsTable.findingsTableColumn.clusterIdColumnLabel',
          { defaultMessage: 'Cluster ID' }
        )}
        tooltipContent={i18n.translate(
          'xpack.csp.findings.findingsTable.findingsTableColumn.clusterIdColumnTooltipLabel',
          { defaultMessage: 'Kube-System Namespace ID' }
        )}
      />
    ),
    width: '150px',
    sortable: true,
    truncateText: true,
    render: (section: string) => (
      <EuiToolTip content={section} anchorClassName="eui-textTruncate">
        <>{section}</>
      </EuiToolTip>
    ),
  },
  {
    field: '@timestamp',
    width: '10%',
    name: i18n.translate(
      'xpack.csp.findings.findingsTable.findingsTableColumn.lastCheckedColumnLabel',
      { defaultMessage: 'Last Checked' }
    ),
    truncateText: true,
    sortable: true,
    render: (timestamp: number) => <TimestampTableCell timestamp={timestamp} />,
  },
] as const;

export const baseFindingsColumns = Object.fromEntries(
  baseColumns.map((column) => [column.field, column])
) as Record<typeof baseColumns[number]['field'], typeof baseColumns[number]>;

export const createColumnWithFilters = <T extends unknown>(
  column: EuiTableFieldDataColumnType<T>,
  { onAddFilter }: { onAddFilter: OnAddFilter }
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

      &:hover {
        > .__filter_buttons {
          opacity: 1;
        }
        > .__filter_value {
          max-width: calc(100% - calc(${euiThemeVars.euiSizeL} * 2));
        }
      }
    `}
  >
    <div className="__filter_value eui-textTruncate" data-test-subj="filter_cell_value">
      {children}
    </div>
    <div
      className="__filter_buttons"
      css={css`
        opacity: 0;
        position: absolute;
        right: 0;
        top: 0;
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

export const LimitedResultsBar = () => (
  <>
    <EuiSpacer size="xxl" />
    <EuiBottomBar data-test-subj="test-bottom-bar">
      <EuiText textAlign="center">
        <FormattedMessage
          id="xpack.csp.findings..bottomBarLabel"
          defaultMessage="These are the first {maxItems} findings matching your search, refine your search to see others."
          values={{
            maxItems: MAX_FINDINGS_TO_LOAD,
          }}
        />
      </EuiText>
    </EuiBottomBar>
  </>
);
