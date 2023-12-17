/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Criteria,
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiTableSortingType,
} from '@elastic/eui';
import { AuditDiffOperation, AuditLog, AuditLogOperation } from '@kbn/audit-plugin/common';
import { i18n } from '@kbn/i18n';
import React, { MouseEvent, useState } from 'react';
import copy from 'copy-to-clipboard';
import { Pagination } from '../../../lib/audit_api/find_audit';
import { useKibana } from '../../../..';

// page={page} sort={sort} onPage={setPage} onSort={setSort}

export const RuleAuditTable = (props: {
  isLoading: boolean;
  items: AuditLog[];
  total: number;
  page: Pagination;
  sort: EuiTableSortingType<AuditLog>['sort'];
  onSort: (sort: EuiTableSortingType<AuditLog>['sort']) => void;
  onPage: (page: Pagination) => void;
}) => {
  const { items, total, isLoading, page, sort, onPage, onSort } = props;
  const { audit: auditService } = useKibana().services;

  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedAudit, setSelectedAudit] = useState<AuditLog | null>(null);

  const columns: Array<EuiBasicTableColumn<AuditLog>> = [
    {
      field: '@timestamp',
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
          onClick: (auditLog) => {
            setSelectedAudit(auditLog);
            setShowModal(!showModal);
          },
          'data-test-subj': 'action-diff',
        },
      ],
    },
  ];

  const diffColumns = (
    operation: AuditLogOperation
  ): Array<
    EuiBasicTableColumn<{
      operation: AuditDiffOperation;
      key: string;
      oldValue: any;
      newValue: any;
    }>
  > => {
    const cols = [
      {
        name: 'Operation',
        field: 'operation',
        width: '10%',
        render: (value: string) => {
          if (value === AuditDiffOperation.ADD) {
            return <EuiBadge color="success">{value}</EuiBadge>;
          }
          if (value === AuditDiffOperation.DELETE) {
            return <EuiBadge color="danger">{value}</EuiBadge>;
          }
          if (value === AuditDiffOperation.UPDATE) {
            return <EuiBadge color="warning">{value}</EuiBadge>;
          }
          return <EuiBadge color="accent">{value}</EuiBadge>;
        },
      },
      {
        field: 'key',
        name: 'Key',
        width: '20%',
        render: (value: string) => {
          return <EuiBadge color="default">{value}</EuiBadge>;
        },
      },
    ];

    if (
      operation === AuditLogOperation.UPDATE ||
      operation === AuditLogOperation.DELETE ||
      operation === AuditLogOperation.GET
    ) {
      cols.push({
        width: '35%',
        field: 'oldValue',
        name: 'Old Value',
        render: (value: string) => {
          return <pre>{value || '-'}</pre>;
        },
      });
    }

    if (operation === AuditLogOperation.CREATE || operation === AuditLogOperation.UPDATE) {
      cols.push({
        width: '35%',
        field: 'newValue',
        name: 'New Value',
        render: (value: string) => {
          return <pre>{value || '-'}</pre>;
        },
      });
    }

    return cols;
  };

  const printDiff = (auditLog: AuditLog) => {
    const diff = auditService!.getAuditDiff(auditLog);
    const diffItems = Object.entries(diff).map(([key, value]) => {
      if (value.operation === AuditDiffOperation.ADD) {
        return {
          operation: value.operation,
          key,
          newValue: value.new,
          oldValue: '',
        };
      }
      if (value.operation === AuditDiffOperation.DELETE) {
        return {
          operation: value.operation,
          key,
          newValue: '',
          oldValue: value.old,
        };
      }
      return {
        operation: value.operation,
        key,
        newValue: value.new,
        oldValue: value.old,
      };
    });
    return (
      <EuiBasicTable
        items={diffItems}
        itemId="id"
        columns={diffColumns(auditLog.operation as AuditLogOperation)}
        data-test-subj="diffTable"
        isExpandable={false}
        tableLayout="auto"
      />
    );
  };

  return (
    <div data-test-subj="ruleAuditTable">
      <EuiSpacer />
      <EuiBasicTable
        loading={isLoading}
        items={items}
        itemId="id"
        columns={columns}
        sorting={{ sort }}
        data-test-subj="auditList"
        pagination={{
          pageIndex: page.index,
          pageSize: page.size,
          totalItemCount: total,
          pageSizeOptions: [5, 50, 100],
        }}
        itemIdToExpandedRowMap={{}}
        isExpandable={false}
        onChange={({ page: changedPage, sort: changedSort }: Criteria<AuditLog>) => {
          if (changedPage) {
            onPage(changedPage);
          }
          if (changedSort) {
            onSort(changedSort);
          }
        }}
      />
      {showModal && selectedAudit ? (
        <EuiModal onClose={() => setShowModal(false)} maxWidth={1280}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>Changes</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>{printDiff(selectedAudit)}</EuiModalBody>
          <EuiModalFooter>
            {selectedAudit?.data.old ? (
              <EuiButtonEmpty
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  copy(selectedAudit?.data.old, { debug: true });
                }}
              >
                {i18n.translate(
                  'xpack.triggersActionsUI.sections.ruleDetails.auditModal.copyOldValue',
                  {
                    defaultMessage: 'Copy Old Record',
                  }
                )}
              </EuiButtonEmpty>
            ) : null}

            {selectedAudit?.data.new ? (
              <EuiButtonEmpty
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  copy(selectedAudit?.data.new, { debug: true });
                }}
              >
                {i18n.translate(
                  'xpack.triggersActionsUI.sections.ruleDetails.auditModal.copyOldValue',
                  {
                    defaultMessage: 'Copy New Record',
                  }
                )}
              </EuiButtonEmpty>
            ) : null}

            <EuiButton
              onClick={() => {
                setShowModal(false);
                setSelectedAudit(null);
              }}
              fill
            >
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
