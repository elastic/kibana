/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React, { Fragment, useMemo, useState } from 'react';
import { upperCase } from 'lodash';
import {
  EuiEmptyPrompt,
  EuiBasicTable,
  EuiText,
  EuiBadge,
  useEuiTheme,
  type Pagination,
  type EuiBasicTableProps,
  type CriteriaWithPagination,
  type EuiTableActionsColumnType,
  type EuiTableFieldDataColumnType,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CspFinding } from '../../../../common/schemas/csp_finding';
import * as TEST_SUBJECTS from '../test_subjects';
import { FindingsRuleFlyout } from '../findings_flyout/findings_flyout';
import {
  baseFindingsColumns,
  createColumnWithFilters,
  getExpandColumn,
  type OnAddFilter,
} from '../layout/findings_layout';
import { getSelectedRowStyle } from '../utils/utils';

type TableProps = Required<EuiBasicTableProps<CspFinding>>;

interface Props {
  loading: boolean;
  items: CspFinding[];
  pagination: Pagination;
  sorting: TableProps['sorting'];
  setTableOptions(options: CriteriaWithPagination<CspFinding>): void;
  onAddFilter: OnAddFilter;
}

const FindingsTableComponent = ({
  loading,
  items,
  pagination,
  sorting,
  setTableOptions,
  onAddFilter,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const [selectedFinding, setSelectedFinding] = useState<CspFinding>();

  const getRowProps = (row: CspFinding) => ({
    'data-test-subj': TEST_SUBJECTS.getFindingsTableRowTestId(row.resource.id),
    style: getSelectedRowStyle(euiTheme, row, selectedFinding),
  });

  const getCellProps = (row: CspFinding, column: EuiTableFieldDataColumnType<CspFinding>) => ({
    'data-test-subj': TEST_SUBJECTS.getFindingsTableCellTestId(column.field, row.resource.id),
  });

  const columns: [
    EuiTableActionsColumnType<CspFinding>,
    ...Array<EuiTableFieldDataColumnType<CspFinding>>
  ] = useMemo(
    () => [
      getExpandColumn<CspFinding>({ onClick: setSelectedFinding }),
      createColumnWithFilters(baseFindingsColumns['resource.id'], { onAddFilter }),
      createColumnWithFilters(baseFindingsColumns['result.evaluation'], { onAddFilter }),
      createColumnWithFilters(baseFindingsColumns['resource.sub_type'], { onAddFilter }),
      createColumnWithFilters(baseFindingsColumns['resource.name'], { onAddFilter }),
      createColumnWithFilters(baseFindingsColumns['rule.name'], { onAddFilter }),
      createColumnWithFilters(baseFindingsColumns['rule.benchmark.name'], { onAddFilter }),
      baseFindingsColumns['rule.section'],
      createColumnWithFilters(baseFindingsColumns.cluster_id, { onAddFilter }),
      baseFindingsColumns['@timestamp'],
    ],
    [onAddFilter]
  );

  // Show "zero state"
  if (!loading && !items.length)
    // TODO: use our own logo
    return (
      <EuiEmptyPrompt
        iconType="logoKibana"
        data-test-subj={TEST_SUBJECTS.LATEST_FINDINGS_TABLE_NO_FINDINGS_EMPTY_STATE}
        title={
          <h2>
            <FormattedMessage
              id="xpack.csp.findings.latestFindings.noFindingsVulnerabilitiesTitle"
              defaultMessage="There are no Vulnerabilities 🎉"
            />
          </h2>
        }
      />
    );

  console.error('items', items);

  const getRiskBadgeColor = (score: number) => {
    if (score < 20) {
      return 'success';
    }

    if (score < 60) {
      return 'warning';
    }

    if (score < 80) {
      return 'accent';
    }

    return 'danger';
  };

  const getBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'danger';
      case 'high':
        return 'accent';
      case 'moderate':
        return 'warning';
      case 'low':
        return 'success';
    }
  };

  return (
    <>
      {items.map((item) => (
        <Fragment key={item.key}>
          <EuiPanel paddingSize="l">
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem>
                <EuiFlexGroup alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiBadge
                      color={getBadgeColor(
                        item.cve_data.alerts.hits.hits[0]._source['kibana.alert.severity']
                      )}
                    >
                      {upperCase(
                        item.cve_data.alerts.hits.hits[0]._source['kibana.alert.severity']
                      )}
                    </EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText>
                      <strong>{item.key}</strong>
                    </EuiText>
                    <EuiText color="subdued" size="s">
                      <p>
                        {moment(
                          item.cve_data.alerts.hits.hits[0]._source['kibana.alert.original_time']
                        ).toLocaleString()}
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup alignItems="center" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiText>Score</EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiBadge
                          color={getRiskBadgeColor(
                            item.cve_data.alerts.hits.hits[0]._source['kibana.alert.risk_score']
                          )}
                        >
                          {item.cve_data.alerts.hits.hits[0]._source['kibana.alert.risk_score']}
                        </EuiBadge>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFlexGroup alignItems="center" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiText>Resources</EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="hollow">{item.cve_data.resources_count.value}</EuiBadge>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiButtonIcon iconType="expand" />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
          <EuiSpacer />
        </Fragment>
      ))}
      {/* <EuiBasicTable
        loading={loading}
        data-test-subj={TEST_SUBJECTS.FINDINGS_TABLE}
        items={items}
        columns={columns}
        pagination={pagination}
        sorting={sorting}
        onChange={setTableOptions}
        rowProps={getRowProps}
        cellProps={getCellProps}
        hasActions
      />
      {selectedFinding && (
        <FindingsRuleFlyout
          findings={selectedFinding}
          onClose={() => setSelectedFinding(undefined)}
        />
      )} */}
    </>
  );
};

export const FindingsTable = React.memo(FindingsTableComponent);
