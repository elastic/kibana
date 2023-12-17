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
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiTableSortingType,
} from '@elastic/eui';
import { AuditDiffOperation, AuditLog } from '@kbn/audit-plugin/common';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { Pagination } from '../../../lib/audit_api/find_audit';
import { useKibana } from '../../../..';

// page={page} sort={sort} onPage={setPage} onSort={setSort}

export const RuleAuditTable = (props: {
  audit: {
    isLoading: boolean;
    data: any[];
    totalItemCount: number;
  };
  page: Pagination;
  sort: EuiTableSortingType<AuditLog>['sort'];
  onSort: (sort: EuiTableSortingType<AuditLog>['sort']) => void;
  onPage: (page: Pagination) => void;
}) => {
  const { audit, page, sort, onPage, onSort } = props;
  const { audit: auditService } = useKibana().services;

  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedAudit, setSelectedAudit] = useState<AuditLog | null>(null);

  const columns: Array<EuiBasicTableColumn<AuditLog>> = useMemo(
    () => [
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
    ],
    [showModal]
  );

  const getBadge = (operation: AuditDiffOperation) => {
    let color = 'warning';
    if (operation === AuditDiffOperation.ADD) {
      color = 'success';
    }
    if (operation === AuditDiffOperation.DELETE) {
      color = 'danger';
    }
    return (
      <EuiFlexItem grow={false} style={{ width: 60 }}>
        <EuiBadge color={color}>{operation}</EuiBadge>
      </EuiFlexItem>
    );
  };

  const printDiff = (auditLog: AuditLog) => {
    const diff = auditService!.getAuditDiff(auditLog);
    return (
      <div>
        {Object.entries(diff).map(([key, value]) => (
          <div key={key}>
            <EuiFlexGroup responsive={false} gutterSize="xs">
              {getBadge(value.operation)}
              <EuiFlexItem grow={false}>
                <EuiBadge color="default">{key} :</EuiBadge>
              </EuiFlexItem>
              {value.operation === AuditDiffOperation.ADD ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color={'success'}>{value.new}</EuiBadge>
                </EuiFlexItem>
              ) : null}
              {value.operation === AuditDiffOperation.DELETE ? (
                <EuiFlexItem grow={false}>
                  <EuiBadge color={'danger'}>{value.old}</EuiBadge>
                </EuiFlexItem>
              ) : null}
              {value.operation === AuditDiffOperation.UPDATE ||
              value.operation === AuditDiffOperation.MOVE ? (
                <>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={'warning'}>{value.old}</EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false} style={{ justifyContent: 'center' }}>
                    <EuiIcon type="sortRight" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={'success'}>{value.new}</EuiBadge>
                  </EuiFlexItem>
                </>
              ) : null}
            </EuiFlexGroup>
            <EuiSpacer size={'xs'} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div data-test-subj="ruleAuditTable">
      <EuiSpacer />
      <EuiBasicTable
        loading={audit.isLoading}
        items={audit.data}
        itemId="id"
        columns={columns}
        sorting={{ sort }}
        data-test-subj="auditList"
        pagination={{
          pageIndex: page.index,
          pageSize: page.size,
          totalItemCount: audit.totalItemCount,
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
        <EuiModal onClose={() => setShowModal(false)}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>Changes</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>{printDiff(selectedAudit)}</EuiModalBody>
          <EuiModalFooter>
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
