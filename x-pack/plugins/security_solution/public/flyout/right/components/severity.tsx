/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { ALERT_SEVERITY } from '@kbn/rule-data-utils';
import { SEVERITY_TITLE } from './translations';
import { useRightPanelContext } from '../context';
import { SeverityBadge } from '../../../detections/components/rules/severity_badge';
import { FLYOUT_HEADER_SEVERITY_TITLE_TEST_ID } from './test_ids';

/**
 * Document details severity displayed in flyout right section header
 */
export const DocumentSeverity: FC = memo(() => {
  const { getFieldsData } = useRightPanelContext();
  const alertSeverity = getFieldsData(ALERT_SEVERITY) as Severity;

  if (!alertSeverity) {
    return <></>;
  }

  return (
    <EuiFlexGroup alignItems="center" direction="row" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs" data-test-subj={FLYOUT_HEADER_SEVERITY_TITLE_TEST_ID}>
          <h5>{`${SEVERITY_TITLE}:`}</h5>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SeverityBadge value={alertSeverity} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

DocumentSeverity.displayName = 'DocumentSeverity';
