/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { Rotation, ScaleType } from '@elastic/charts';
import styled, { useTheme } from 'styled-components';
import { FormattedNumber } from '@kbn/i18n-react';
import numeral from '@elastic/numeral';
import { BarChart } from '../../../../common/components/charts/barchart';
import { LastUpdatedAt } from '../util';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { HeaderSection } from '../../../../common/components/header_section';
import {
  CASES,
  CASES_BY_STATUS_SECTION_TITLE,
  CLOSED,
  IN_PROGRESS,
  OPEN,
  VIEW_CASES,
} from '../translations';
import { LinkButton } from '../../../../common/components/links';
import { useCasesByStatus } from './use_cases_by_status';
import { SecurityPageName } from '../../../../../common/constants';
import { useFormatUrl } from '../../../../common/components/link_to';
import { appendSearch } from '../../../../common/components/link_to/helpers';
import { useNavigation } from '../../../../common/lib/kibana';

const CASES_BY_STATUS_ID = 'casesByStatus';

export const numberFormatter = (value: string | number): string => value.toLocaleString();

export const barchartConfigs = {
  series: {
    xScaleType: ScaleType.Ordinal,
    yScaleType: ScaleType.Linear,
    stackAccessors: ['g'],
    barSeriesStyle: {
      rect: {
        widthPixel: 22,
      },
    },
  },
  axis: {
    xTickFormatter: numberFormatter,

    tickLabel: {
      padding: 16,
      fontSize: 16,
    },
    left: {
      style: {
        tickLine: {
          size: 0,
        },
        tickLabel: {
          padding: 16,
          fontSize: 14,
        },
      },
    },
    bottom: {
      style: {
        tickLine: {
          size: 0,
        },
        tickLabel: {
          padding: 16,
          fontSize: 10.5,
        },
      },
      labelFormat: (d: unknown) => numeral(d).format('0'),
    },
  },
  settings: {
    rotation: 90 as Rotation,
  },
  customHeight: 146,
};

const barColors = {
  empty: 'rgba(105, 112, 125, 0.1)',
  open: '#79aad9',
  'in-progress': '#f1d86f',
  closed: '#d3dae6',
};

const emptyChartSettings = [
  {
    key: 'open',
    value: [{ y: 20, x: OPEN, g: OPEN }],
    color: barColors.empty,
  },
  {
    key: 'in-progress',
    value: [{ y: 20, x: IN_PROGRESS, g: IN_PROGRESS }],
    color: barColors.empty,
  },
  {
    key: 'closed',
    value: [{ y: 20, x: CLOSED, g: CLOSED }],
    color: barColors.empty,
  },
];

const StyledEuiFlexItem = styled(EuiFlexItem)`
  align-items: center;
  width: 60%;
`;

const Wrapper = styled.div`
  width: 100%;
  position: relative;
`;

const BarChartMask = styled.div<{ $totalCounts: number }>`
  background-color: transparent;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: ${({ $totalCounts }) =>
    /* If all totalCounts equals 0, disable chart interaction*/
    $totalCounts === 0 ? 1 : 0};
`;

const CasesByStatusComponent: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const emptyLabelStyle = useMemo(
    () => ({
      color: euiTheme.colors.disabled,
    }),
    [euiTheme.colors.disabled]
  );
  const { toggleStatus, setToggleStatus } = useQueryToggle(CASES_BY_STATUS_ID);
  const { getAppUrl, navigateTo } = useNavigation();
  const { search } = useFormatUrl(SecurityPageName.case);
  const caseUrl = getAppUrl({ deepLinkId: SecurityPageName.case, path: appendSearch(search) });

  const goToCases = useCallback(
    (ev) => {
      ev.preventDefault();
      navigateTo({ url: caseUrl });
    },
    [caseUrl, navigateTo]
  );
  const { closed, inProgress, isLoading, open, totalCounts, updatedAt } = useCasesByStatus({
    skip: !toggleStatus,
  });

  const chartData = useMemo(
    () =>
      open === 0 && inProgress === 0 && closed === 0
        ? emptyChartSettings
        : [
            {
              key: 'open',
              value: [{ y: open, x: OPEN, g: OPEN }],
              color: barColors.open,
            },
            {
              key: 'in-progress',
              value: [{ y: inProgress, x: IN_PROGRESS, g: IN_PROGRESS }],
              color: barColors['in-progress'],
            },
            {
              key: 'closed',
              value: [{ y: closed, x: CLOSED, g: CLOSED }],
              color: barColors.closed,
            },
          ],
    [closed, inProgress, open]
  );

  return (
    <EuiPanel hasBorder>
      <HeaderSection
        id={CASES_BY_STATUS_ID}
        title={CASES_BY_STATUS_SECTION_TITLE}
        titleSize="s"
        toggleStatus={toggleStatus}
        toggleQuery={setToggleStatus}
        subtitle={<LastUpdatedAt updatedAt={updatedAt} isUpdating={isLoading} />}
        showInspectButton={false}
      >
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            <LinkButton href={caseUrl} onClick={goToCases}>
              {VIEW_CASES}
            </LinkButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </HeaderSection>
      {!isLoading && toggleStatus && (
        <EuiFlexGroup justifyContent="center" alignItems="center" direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiText className="eui-textCenter" size="s" grow={false}>
              {isLoading ? (
                <EuiSpacer size="l" />
              ) : (
                <>
                  <b>
                    <FormattedNumber value={totalCounts} />
                  </b>
                  <> </>
                  <small>
                    {totalCounts === 0 ? (
                      <span style={emptyLabelStyle}>{CASES(totalCounts)}</span>
                    ) : (
                      <EuiLink onClick={goToCases}>{CASES(totalCounts)}</EuiLink>
                    )}
                  </small>
                </>
              )}
            </EuiText>
          </EuiFlexItem>
          <StyledEuiFlexItem grow={false}>
            <Wrapper data-test-subj="chart-wrapper">
              <BarChartMask $totalCounts={totalCounts} />
              <BarChart configs={barchartConfigs} barChart={chartData} />
            </Wrapper>
          </StyledEuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};

export const CasesByStatus = React.memo(CasesByStatusComponent);
