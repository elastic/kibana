/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { Rotation, ScaleType } from '@elastic/charts';
import styled from 'styled-components';
import { FormattedNumber } from '@kbn/i18n-react';
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
  },
  settings: {
    rotation: 90 as Rotation,
  },
  customHeight: 146,
};

const Wrapper = styled.div`
  width: 400px;
`;

export const CasesByStatus: React.FC = () => {
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
    () => [
      {
        key: 'open',
        value: [{ y: open, x: OPEN, g: OPEN }],
        color: '#79aad9',
      },
      {
        key: 'in-progress',
        value: [{ y: inProgress, x: IN_PROGRESS, g: IN_PROGRESS }],
        color: '#f1d86f',
      },
      {
        key: 'closed',
        value: [{ y: closed, x: CLOSED, g: CLOSED }],
        color: '#d3dae6',
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
                    <EuiButtonEmpty onClick={goToCases} flush="left">
                      {CASES(totalCounts)}
                    </EuiButtonEmpty>
                  </small>
                </>
              )}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ alignItems: 'center' }}>
            <Wrapper data-test-subj="chart-wrapper">
              <BarChart configs={barchartConfigs} barChart={chartData} />
            </Wrapper>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
};
