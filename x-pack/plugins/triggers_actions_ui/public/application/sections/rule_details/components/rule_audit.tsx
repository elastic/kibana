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
  EuiTitle,
  Pagination,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { get, isEmpty, isUndefined } from 'lodash';
import { AuditLog } from '@kbn/audit-plugin/common';
import { useKibana } from '../../../..';
import { RefreshToken } from './types';
import { useLoadAlertingAudit } from '../../../hooks/use_load_audt';

export interface RuleAuditProps {
  ruleId: string;
  refreshToken?: RefreshToken;
}

const DELETED = 'deleted';

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

  const [pagination, setPagination] = useState<Pagination>({
    pageIndex: 0,
    pageSize: 5,
    totalItemCount: 0,
    pageSizeOptions: [5, 50, 100],
  });

  const [sort, setSort] = useState<EuiTableSortingType<AuditLog>['sort']>({
    field: '@timestamp',
    direction: 'asc',
  });

  const { audit, loadAlertingAudit } = useLoadAlertingAudit({
    page: pagination,
    sort: { field: '@timestamp', direction: 'asc' },
    onPage: setPagination,
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

  const onTableChange = ({ page: tablePage, sort: tableSort }: Criteria<AuditLog>) => {
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

  const addChange = ({
    key,
    value,
    oldValue,
  }: {
    key: string;
    value: string;
    oldValue?: string;
  }) => {
    return (
      <>
        <EuiFlexGroup responsive={false} gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiBadge color="default">{key} :</EuiBadge>
          </EuiFlexItem>
          {!isUndefined(oldValue) ? (
            <>
              <EuiFlexItem grow={false}>
                <EuiBadge color="warning">{oldValue}</EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ justifyContent: 'center' }}>
                <EuiIcon type="sortRight" />
              </EuiFlexItem>
            </>
          ) : null}
          <EuiFlexItem grow={false}>
            <EuiBadge color={value === DELETED ? 'danger' : 'success'}>{value}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size={'xs'} />
      </>
    );
  };

  const addTitle = (title: string) => {
    return (
      <>
        <EuiSpacer size={'m'} />
        <EuiTitle size="s">
          <h3>{title}</h3>
        </EuiTitle>
        <EuiSpacer size={'s'} />
      </>
    );
  };

  const printDiff = (auditLog: AuditLog) => {
    const diff = auditService!.getAuditDiff(auditLog);
    const result: React.ReactNode[] = [];

    if (!isEmpty(diff.added)) {
      result.push(addTitle('Added'));
      Object.entries(diff.added).map(([key, value]) => {
        result.push(addChange({ key, value: JSON.stringify(value) }));
      });
    }

    if (!isEmpty(diff.updated)) {
      result.push(addTitle('Updated'));
      Object.entries(diff.updated).map(([key, value]) => {
        const newPath = key.replace(/.(\d+)/g, '[$1]');
        const oldValue = get(JSON.parse(selectedAudit?.data.old), newPath);
        result.push(
          addChange({ key, value: JSON.stringify(value), oldValue: JSON.stringify(oldValue) })
        );
      });
    }

    if (!isEmpty(diff.deleted)) {
      result.push(addTitle('Deleted'));
      Object.entries(diff.deleted).map(([key, value]) => {
        result.push(addChange({ key, value: DELETED }));
      });
    }

    return (
      <div>
        {result.map((change, index) => (
          <div key={`change-${index}`}>{change}</div>
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
          <EuiModalBody>{printDiff(selectedAudit)}</EuiModalBody>
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
