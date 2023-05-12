/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Criteria,
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiTableSortingType,
  Pagination,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AlertingAuditLog } from '@kbn/alerting-plugin/common';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Delta, diff } from 'jsondiffpatch';
import { isObject } from 'lodash';
import { useLoadAlertingAudit } from '../../../hooks/use_load_alerting_audit';

export interface RuleAuditProps {
  ruleId: string;
  refreshToken?: number;
}

export const RuleAudit = (props: RuleAuditProps) => {
  const { ruleId, refreshToken } = props;
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedAudit, setSelectedAudit] = useState<AlertingAuditLog | null>(null);
  const isInitialized = useRef(false);

  const columns: Array<EuiBasicTableColumn<AlertingAuditLog>> = useMemo(
    () => [
      {
        field: 'timestamp',
        name: i18n.translate('xpack.triggersActionsUI.sections.ruleDetails.auditColumn.timestamp', {
          defaultMessage: 'Timestamp',
        }),
      },
      {
        field: 'user',
        name: i18n.translate('xpack.triggersActionsUI.sections.ruleDetails.auditColumn.user', {
          defaultMessage: 'User',
        }),
      },
      {
        field: 'operation',
        name: i18n.translate('xpack.triggersActionsUI.sections.ruleDetails.auditColumn.operation', {
          defaultMessage: 'Operation',
        }),
      },
      {
        name: 'Actions',
        actions: [
          {
            name: <span>Show diff</span>,
            description: 'Show the modified properties',
            icon: 'search',
            type: 'icon',
            onClick: (audit) => {
              setSelectedAudit(audit);
              setShowModal(!showModal);
            },
            'data-test-subj': 'action-diff',
          },
        ],
      },
    ],
    [showModal]
  );

  const [pagination, setPagination] = useState<Pagination>({
    pageIndex: 0,
    pageSize: 5,
    totalItemCount: 0,
    pageSizeOptions: [5, 50, 100],
  });

  const [sort, setSort] = useState<EuiTableSortingType<AlertingAuditLog>['sort']>({
    field: 'timestamp',
    direction: 'asc',
  });

  const { audit, loadAlertingAudit } = useLoadAlertingAudit({
    page: pagination,
    sort: { field: 'timestamp', direction: 'asc' },
    onPage: setPagination,
    filter: `audit.attributes.subjectId: ${ruleId}`,
  });

  useEffect(() => {
    if (isInitialized.current) {
      loadAlertingAudit();
    }
    isInitialized.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  const onTableChange = ({ page: tablePage, sort: tableSort }: Criteria<AlertingAuditLog>) => {
    if (tablePage) {
      const { index: pageIndex, size: pageSize } = tablePage;
      setPagination({
        ...pagination,
        pageIndex,
        pageSize,
      });
    }
    if (tableSort) {
      const { field: sortField, direction: sortDirection } = tableSort;
      setSort({
        field: sortField,
        direction: sortDirection,
      });
    }
  };

  const getDiff = (auditLog: AlertingAuditLog) => {
    return diff(auditLog.data.old || {}, auditLog.data.new || {}) || {};
  };

  const printDiff = (delta: Delta, path: string[] = []) => {
    const result: React.ReactNode[] = [];

    const flatten = (obj: Delta): void => {
      for (const [key, value] of Object.entries(obj)) {
        if (key === '_t') continue;
        if (Array.isArray(value)) {
          const oldValue = value[0];
          const newValue = value[1];
          const isCreate = value[1] === undefined;
          if (isCreate) {
            result.push(
              <>
                <EuiFlexGroup responsive={false} gutterSize="xs">
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="default">{[...path, key].join('.')} :</EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {isObject(oldValue) ? (
                      printDiff(oldValue)
                    ) : (
                      <EuiBadge color="success">{JSON.stringify(oldValue)}</EuiBadge>
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size={'xs'} />
              </>
            );
          } else {
            result.push(
              <>
                <EuiFlexGroup responsive={false} gutterSize="xs">
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="default">{[...path, key].join('.')} :</EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {isObject(oldValue) ? (
                      printDiff(oldValue, path)
                    ) : (
                      <EuiBadge color="warning">{JSON.stringify(oldValue)}</EuiBadge>
                    )}
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="success">
                      {isObject(newValue) ? printDiff(newValue) : JSON.stringify(newValue)}
                    </EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size={'xs'} />
              </>
            );
          }
        } else if (isObject(value)) {
          path.push(key);
          flatten(value);
        } else {
          result.push(
            <>
              <EuiFlexGroup responsive={false} gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <EuiBadge color="default">{[...path, key].join('.')} :</EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="success">{JSON.stringify(value)}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size={'xs'} />
            </>
          );
        }
      }
      path = [];
    };
    flatten(delta);

    return <div>{result.map((change) => change)}</div>;
  };

  return (
    <div data-test-subj="ruleAuditContainer">
      <EuiSpacer />
      <EuiBasicTable
        loading={audit.isLoading}
        items={audit.data}
        itemId="id"
        columns={columns}
        sorting={{ sort }}
        data-test-subj="auditList"
        pagination={pagination}
        itemIdToExpandedRowMap={{}}
        isExpandable={false}
        onChange={onTableChange}
      />
      {showModal && selectedAudit ? (
        <EuiModal onClose={() => setShowModal(false)}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>Changes</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <pre>{printDiff(getDiff(selectedAudit))}</pre>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButton onClick={() => setShowModal(false)} fill>
              {i18n.translate('xpack.triggersActionsUI.sections.ruleDetails.auditModal.close', {
                defaultMessage: 'Close',
              })}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      ) : null}
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleAudit as default };
