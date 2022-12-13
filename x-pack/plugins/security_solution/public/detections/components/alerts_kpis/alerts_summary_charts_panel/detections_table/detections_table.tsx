/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiPanel, EuiInMemoryTable } from '@elastic/eui';
import React, { useMemo } from 'react';
import type { DetectionsData } from '../types';
import { HeaderSection } from '../../../../../common/components/header_section';
import { InspectButtonContainer } from '../../../../../common/components/inspect';
import { getDetectionsTableColumns } from '../columns';
import * as i18n from '../translations';

interface DetectionsTableProps {
  data: DetectionsData[] | null;
  isLoading: boolean;
  uniqueQueryId: string;
}

export const DetectionsTable: React.FC<DetectionsTableProps> = ({
  data,
  isLoading,
  uniqueQueryId,
}) => {
  const columns = useMemo(() => getDetectionsTableColumns(), []);
  const items = data ?? [];

  return (
    <EuiFlexItem>
      <InspectButtonContainer>
        <EuiPanel>
          <HeaderSection
            id={uniqueQueryId}
            inspectTitle={i18n.DETECTIONS_TITLE}
            outerDirection="row"
            title={i18n.DETECTIONS_TITLE}
            titleSize="xs"
            hideSubtitle
          />
          <EuiInMemoryTable
            data-test-subj="alert-detections-table"
            columns={columns}
            items={items}
            loading={isLoading}
          />
        </EuiPanel>
      </InspectButtonContainer>
    </EuiFlexItem>
  );
};

DetectionsTable.displayName = 'DetectionsTable';
