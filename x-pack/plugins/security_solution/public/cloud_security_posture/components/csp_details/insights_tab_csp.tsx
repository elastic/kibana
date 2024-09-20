/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { MisconfigurationFindingsDetailsTable } from './misconfiguration_findings_details_table';

/**
 * Insights view displayed in the document details expandable flyout left section
 */
export const InsightsTabCsp = memo(
  ({ name, fieldName }: { name: string; fieldName: 'host.name' | 'user.name' }) => {
    return (
      <>
        <EuiSpacer size="xl" />
        <MisconfigurationFindingsDetailsTable fieldName={fieldName} queryName={name} />
      </>
    );
  }
);

InsightsTabCsp.displayName = 'InsightsTab';
