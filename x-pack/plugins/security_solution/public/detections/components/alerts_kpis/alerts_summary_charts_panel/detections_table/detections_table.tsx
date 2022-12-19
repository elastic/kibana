/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiPanel, EuiInMemoryTable } from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import type { ChartsPanelProps, DetectionsData } from '../types';
import { HeaderSection } from '../../../../../common/components/header_section';
import { InspectButtonContainer } from '../../../../../common/components/inspect';
import { getDetectionsTableColumns } from '../columns';
import * as i18n from '../translations';

const TABLE_HEIGHT = 150;

export const DetectionsTable: React.FC<ChartsPanelProps> = ({ data, isLoading, uniqueQueryId }) => {
  const columns = useMemo(() => getDetectionsTableColumns(), []);
  const items = (data as DetectionsData[]) ?? [];
  const Wrapper = styled.div`
    margin-top: -${({ theme }) => theme.eui.euiSizeS};
    @media only screen and (min-width: ${(props) => props.theme.eui.euiBreakpoints.xl}) {
      ${() => `height: ${TABLE_HEIGHT}px;`}
    }
  `;
  return (
    <EuiFlexItem style={{ minWidth: 350 }}>
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
          <Wrapper data-test-subj="alert-detections-table" className="eui-yScroll">
            <EuiInMemoryTable columns={columns} items={items} loading={isLoading} />
          </Wrapper>
        </EuiPanel>
      </InspectButtonContainer>
    </EuiFlexItem>
  );
};

DetectionsTable.displayName = 'DetectionsTable';
