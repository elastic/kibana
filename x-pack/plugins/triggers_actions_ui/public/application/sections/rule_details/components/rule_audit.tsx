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
  EuiIcon,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiTableSortingType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AuditDiffOperation, AuditLog } from '@kbn/audit-plugin/common';
import { Pagination } from '../../../lib/audit_api/find_audit';
import { useKibana } from '../../../..';
import { RefreshToken } from './types';
import { useLoadAlertingAudit } from '../../../hooks/use_load_audt';

export interface RuleAuditProps {
  ruleId: string;
  refreshToken?: RefreshToken;
}

export const RuleAudit = (props: RuleAuditProps) => {
  const { ruleId, refreshToken } = props;
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedAudit, setSelectedAudit] = useState<AuditLog | null>(null);
  const isInitialized = useRef(false);

  const { audit: auditService } = useKibana().services;

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

  const [page, setPage] = useState<Pagination>({
    index: 0,
    size: 5,
  });

  const [sort, setSort] = useState<EuiTableSortingType<AuditLog>['sort']>({
    field: '@timestamp',
    direction: 'asc',
  });

  const { audit, loadAlertingAudit } = useLoadAlertingAudit({
    page,
    sort,
    onPage: setPage,
    // search:'', // search by keyword
    filter: `audit.attributes.namespace: alerting AND audit.attributes.subjectId: ${ruleId}`,
  });

  useEffect(() => {
    if (isInitialized.current) {
      loadAlertingAudit();
    }
    isInitialized.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

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
    <div data-test-subj="ruleAuditContainer">
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
            setPage(changedPage);
          }
          if (changedSort) {
            setSort(changedSort);
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

// eslint-disable-next-line import/no-default-export
export { RuleAudit as default };
