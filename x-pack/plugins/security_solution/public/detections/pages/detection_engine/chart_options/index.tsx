/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { ChartSelectTour } from '../chart_options_tours/chart_select_tour';
import { ViewChartToggleTour } from '../chart_options_tours/view_chart_toggle_tour';
import { ChartSelect } from '../chart_select';
import { AlertViewSelection } from '../chart_select/helpers';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { ViewChartToggle } from '../view_chart_toggle';

const HeaderButtonContainer = styled.div`
  margin-left: ${({ theme }) => theme.eui.euiSizeS};
`;

export interface Props {
  alertViewSelection: AlertViewSelection;
  setAlertViewSelection: (alertViewSelection: AlertViewSelection) => void;
  setShowCountTable: (value: boolean) => void;
  setShowRiskChart: (value: boolean) => void;
  setShowTrendChart: (value: boolean) => void;
  setTourStep1Completed: (value: boolean) => void;
  setTourStep2Completed: (value: boolean) => void;
  showCountTable: boolean;
  showRiskChart: boolean;
  showTrendChart: boolean;
  tourStep1Completed: boolean;
  tourStep2Completed: boolean;
}

const ChartOptionsComponent = ({
  alertViewSelection,
  setAlertViewSelection,
  setShowCountTable,
  setShowRiskChart,
  setShowTrendChart,
  setTourStep1Completed,
  setTourStep2Completed,
  showCountTable,
  showRiskChart,
  showTrendChart,
  tourStep1Completed,
  tourStep2Completed,
}: Props) => {
  const showChartsToggle = useIsExperimentalFeatureEnabled('showChartsToggle'); // feature flag

  return (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      {showChartsToggle && (
        <EuiFlexItem grow={false}>
          <ViewChartToggleTour
            tourStep1Completed={tourStep1Completed}
            setTourStep1Completed={setTourStep1Completed}
            setTourStep2Completed={setTourStep2Completed}
          >
            <HeaderButtonContainer>
              <ViewChartToggle
                alertViewSelection={alertViewSelection}
                setShowCountTable={setShowCountTable}
                setShowRiskChart={setShowRiskChart}
                setShowTrendChart={setShowTrendChart}
                showCountTable={showCountTable}
                showRiskChart={showRiskChart}
                showTrendChart={showTrendChart}
              />
            </HeaderButtonContainer>
          </ViewChartToggleTour>
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false}>
        <ChartSelectTour
          setTourStep2Completed={setTourStep2Completed}
          showRiskChart={showRiskChart}
          showTrendChart={showTrendChart}
          tourStep1Completed={tourStep1Completed}
          tourStep2Completed={tourStep2Completed}
        >
          <HeaderButtonContainer>
            <ChartSelect
              alertViewSelection={alertViewSelection}
              setAlertViewSelection={setAlertViewSelection}
              setShowCountTable={setShowCountTable}
              setShowRiskChart={setShowRiskChart}
              setShowTrendChart={setShowTrendChart}
            />
          </HeaderButtonContainer>
        </ChartSelectTour>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

ChartOptionsComponent.displayName = 'ChartOptionsComponent';
export const ChartOptions = React.memo(ChartOptionsComponent);
