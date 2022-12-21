/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexItem,
  EuiPanel,
  EuiInMemoryTable,
  EuiColorPaletteDisplay,
  EuiSpacer,
  EuiFlexGroup,
  EuiHealth,
  EuiText,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import type { ChartsPanelProps, DetectionsData, AlertType } from '../types';
import { HeaderSection } from '../../../../../common/components/header_section';
import { InspectButtonContainer } from '../../../../../common/components/inspect';
import { getDetectionsTableColumns } from '../columns';
import * as i18n from '../translations';

const TABLE_HEIGHT = 150;

const StyledEuiColorPaletteDisplay = styled(EuiColorPaletteDisplay)`
  &.risk-score-severity-bar {
    border: none;
    border-radius: 0;
    &:after {
      border: none;
    }
  }
`;
interface PalletteObject {
  stop: number;
  color: string;
}
type PalletteArray = PalletteObject[];
const EVENT_TYPE_COLOUR = {
  Detection: '#54B399',
  Prevention: '#D36086',
};

export const DetectionsTable: React.FC<ChartsPanelProps> = ({ data, isLoading, uniqueQueryId }) => {
  const columns = useMemo(() => getDetectionsTableColumns(), []);
  const items = (data as DetectionsData[]) ?? [];
  const Wrapper = styled.div`
    margin-top: -${({ theme }) => theme.eui.euiSizeS};
    @media only screen and (min-width: ${(props) => props.theme.eui.euiBreakpoints.xl}) {
      ${() => `height: ${TABLE_HEIGHT}px;`}
    }
  `;

  const holder: { Detection: number; Prevention: number } = useMemo(
    () => ({ Detection: 0, Prevention: 0 }),
    []
  );

  items.forEach(function (d) {
    if (holder[d.type]) {
      holder[d.type] = holder[d.type] + d.value;
    } else {
      holder[d.type] = d.value;
    }
  });

  const palette = useMemo(
    () =>
      (Object.keys(holder) as AlertType[]).reduce((acc: PalletteArray, type: AlertType) => {
        const previousStop = acc.length > 0 ? acc[acc.length - 1].stop : 0;
        const newEntry: PalletteObject = {
          stop: previousStop + (holder[type] || 0),
          color: EVENT_TYPE_COLOUR[type],
        };
        acc.push(newEntry);
        return acc;
      }, [] as PalletteArray),
    [holder]
  );

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
            className="no-margin"
            toggleStatus={false}
          />
          <EuiFlexGroup
            justifyContent="spaceBetween"
            gutterSize="m"
            data-test-subj="risk-score-severity-badges"
          >
            <EuiFlexItem grow={false} />
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="m">
                {(Object.keys(holder) as AlertType[]).map((type) => (
                  <EuiFlexItem key={type} grow={false}>
                    <EuiFlexGroup alignItems="center" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiHealth className="eui-alignMiddle" color={EVENT_TYPE_COLOUR[type]}>
                          <EuiText size="xs">{`${type}:`}</EuiText>
                        </EuiHealth>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs">{holder[type] || 0}</EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <StyledEuiColorPaletteDisplay
            className="risk-score-severity-bar"
            data-test-subj="risk-score-severity-bar"
            size="xs"
            palette={palette}
          />
          <EuiSpacer size="m" />
          <Wrapper data-test-subj="alert-detections-table" className="eui-yScroll">
            <EuiInMemoryTable columns={columns} items={items} loading={isLoading} />
          </Wrapper>
        </EuiPanel>
      </InspectButtonContainer>
    </EuiFlexItem>
  );
};

DetectionsTable.displayName = 'DetectionsTable';
