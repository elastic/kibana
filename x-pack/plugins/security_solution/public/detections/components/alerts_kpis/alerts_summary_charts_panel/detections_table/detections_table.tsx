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
import type { SortOrder } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ChartsPanelProps, DetectionsData, AlertType } from '../types';
import { HeaderSection } from '../../../../../common/components/header_section';
import { InspectButtonContainer } from '../../../../../common/components/inspect';
import { getDetectionsTableColumns } from '../columns';
import * as i18n from '../translations';
import { EVENT_TYPE_COLOUR } from '../helpers';

const TABLE_HEIGHT = 200;

const ColorPaletteWrapperOp1 = styled('div')`
  position: relative;
  margin-top: -235px;
`;

const ColorPaletteWrapperOp2 = styled('div')`
  position: relative;
  margin-top: -220px;
`;

const StyledEuiColorPaletteDisplay = styled(EuiColorPaletteDisplay)`
  border: none;
  border-radius: 0;
`;
interface PalletteObject {
  stop: number;
  color: string;
}
type PalletteArray = PalletteObject[];

export const DetectionsTable: React.FC<ChartsPanelProps> = ({
  data,
  isLoading,
  uniqueQueryId,
  option,
}) => {
  const columns = useMemo(() => getDetectionsTableColumns(), []);
  const items = (data as DetectionsData[]) ?? [];
  const Wrapper = styled.div`
    margin-top: -${({ theme }) => theme.eui.euiSizeS};
    @media only screen and (min-width: ${(props) => props.theme.eui.euiBreakpoints.xl}) {
      ${() => `height: ${TABLE_HEIGHT}px;`}
    }
    height: ${TABLE_HEIGHT}px;
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

  const sorting: { sort: { field: keyof DetectionsData; direction: SortOrder } } = {
    sort: {
      field: 'value',
      direction: 'desc',
    },
  };

  const palette = useMemo(() => {
    const arr = (Object.keys(holder) as AlertType[]).reduce(
      (acc: PalletteArray, type: AlertType) => {
        const previousStop = acc.length > 0 ? acc[acc.length - 1].stop : 0;
        const newEntry: PalletteObject = {
          stop: previousStop + (holder[type] || 0),
          color: EVENT_TYPE_COLOUR[type],
        };
        acc.push(newEntry);
        return acc;
      },
      [] as PalletteArray
    );
    return arr;
  }, [holder]);

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
          />
          <Wrapper data-test-subj="alert-detections-table" className="eui-yScroll">
            <EuiInMemoryTable
              columns={columns}
              items={items}
              loading={isLoading}
              sorting={sorting}
            />
          </Wrapper>
          {option === 1 && (
            <ColorPaletteWrapperOp1>
              <EuiFlexGroup
                justifyContent="flexEnd"
                gutterSize="m"
                data-test-subj="risk-score-severity-badges"
              >
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
              <EuiSpacer size="s" />
              <StyledEuiColorPaletteDisplay
                className="risk-score-severity-bar"
                data-test-subj="risk-score-severity-bar"
                size="xs"
                palette={palette}
              />
            </ColorPaletteWrapperOp1>
          )}
          {option === 2 && (
            <ColorPaletteWrapperOp2>
              <EuiFlexGroup
                justifyContent="flexEnd"
                gutterSize="m"
                data-test-subj="risk-score-severity-badges"
              >
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
              <EuiSpacer size="xs" />
              <StyledEuiColorPaletteDisplay
                className="risk-score-severity-bar"
                data-test-subj="risk-score-severity-bar"
                size="xs"
                palette={palette}
              />
            </ColorPaletteWrapperOp2>
          )}
        </EuiPanel>
      </InspectButtonContainer>
    </EuiFlexItem>
  );
};

DetectionsTable.displayName = 'DetectionsTable';
