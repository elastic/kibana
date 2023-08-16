/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiDataGridColumn, EuiDataGridColumnCellAction, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CspVulnerabilityFinding } from '../../../../common/schemas';
import { getFilters } from './get_filters';
import { FILTER_IN, FILTER_OUT } from '../translations';

export const getVulnerabilitiesGridCellActions = <
  T extends Array<Partial<CspVulnerabilityFinding>>
>({
  data,
  columns,
  columnGridFn,
  pageSize,
  setUrlQuery,
  filters,
  dataView,
}: {
  data: T;
  columns: Record<string, string>;
  columnGridFn: (cellActions: EuiDataGridColumnCellAction[]) => EuiDataGridColumn[];
  pageSize: number;
  setUrlQuery: (query: any) => void;
  filters: any;
  dataView: any;
}) => {
  const getColumnIdValue = (rowIndex: number, columnId: string) => {
    const vulnerabilityRow = data[rowIndex];
    if (!vulnerabilityRow) return null;

    if (columnId === columns.vulnerability) {
      return vulnerabilityRow.vulnerability?.id;
    }
    if (columnId === columns.cvss) {
      return vulnerabilityRow.vulnerability?.score.base;
    }
    if (columnId === columns.resourceId) {
      return vulnerabilityRow.resource?.id;
    }
    if (columnId === columns.resourceName) {
      return vulnerabilityRow.resource?.name;
    }
    if (columnId === columns.severity) {
      return vulnerabilityRow.vulnerability?.severity;
    }
    if (columnId === columns.package) {
      return vulnerabilityRow.vulnerability?.package?.name;
    }
    if (columnId === columns.version) {
      return vulnerabilityRow.vulnerability?.package?.version;
    }
    if (columnId === columns.fixedVersion) {
      return vulnerabilityRow.vulnerability?.package?.fixed_version;
    }
    if (columnId === columns.region) {
      return vulnerabilityRow.cloud?.region;
    }
  };

  const cellActions: EuiDataGridColumnCellAction[] = [
    ({ Component, rowIndex, columnId }) => {
      const rowIndexFromPage = rowIndex > pageSize - 1 ? rowIndex % pageSize : rowIndex;

      const value = getColumnIdValue(rowIndexFromPage, columnId);

      if (!value) return null;
      return (
        <EuiToolTip
          position="top"
          content={i18n.translate(
            'xpack.csp.vulnerabilities.vulnerabilitiesTableCell.addFilterButtonTooltip',
            {
              defaultMessage: 'Add {columnId} filter',
              values: { columnId },
            }
          )}
        >
          <Component
            iconType="plusInCircle"
            aria-label={i18n.translate(
              'xpack.csp.vulnerabilities.vulnerabilitiesTableCell.addFilterButton',
              {
                defaultMessage: 'Add {columnId} filter',
                values: { columnId },
              }
            )}
            onClick={() => {
              setUrlQuery({
                pageIndex: 0,
                filters: getFilters({
                  filters,
                  dataView,
                  field: columnId,
                  value,
                  negate: false,
                }),
              });
            }}
          >
            {FILTER_IN}
          </Component>
        </EuiToolTip>
      );
    },
    ({ Component, rowIndex, columnId }) => {
      const rowIndexFromPage = rowIndex > pageSize - 1 ? rowIndex % pageSize : rowIndex;

      const value = getColumnIdValue(rowIndexFromPage, columnId);

      if (!value) return null;
      return (
        <EuiToolTip
          position="top"
          content={i18n.translate(
            'xpack.csp.vulnerabilities.vulnerabilitiesTableCell.addNegatedFilterButtonTooltip',
            {
              defaultMessage: 'Add {columnId} negated filter',
              values: { columnId },
            }
          )}
        >
          <Component
            iconType="minusInCircle"
            aria-label={i18n.translate(
              'xpack.csp.vulnerabilities.vulnerabilitiesTableCell.addNegateFilterButton',
              {
                defaultMessage: 'Add {columnId} negated filter',
                values: { columnId },
              }
            )}
            onClick={() => {
              setUrlQuery({
                pageIndex: 0,
                filters: getFilters({
                  filters,
                  dataView,
                  field: columnId,
                  value,
                  negate: true,
                }),
              });
            }}
          >
            {FILTER_OUT}
          </Component>
        </EuiToolTip>
      );
    },
  ];

  return columnGridFn(cellActions);
};
