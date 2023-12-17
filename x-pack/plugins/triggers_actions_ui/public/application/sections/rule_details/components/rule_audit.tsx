/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { EuiTableSortingType } from '@elastic/eui';

import { AuditLog } from '@kbn/audit-plugin/common';
import { RuleAuditTable } from './rule_audit_table';
import { Pagination } from '../../../lib/audit_api/find_audit';
import { RefreshToken } from './types';
import { useLoadAlertingAudit } from '../../../hooks/use_load_audt';

export interface RuleAuditProps {
  ruleId: string;
  refreshToken?: RefreshToken;
}

export const RuleAudit = (props: RuleAuditProps) => {
  const { ruleId, refreshToken } = props;
  const isInitialized = useRef(false);

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

  return (
    <div data-test-subj="ruleAuditContainer">
      <RuleAuditTable audit={audit} page={page} sort={sort} onPage={setPage} onSort={setSort} />
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleAudit as default };
