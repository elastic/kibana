/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React, { useCallback } from 'react';

import { AlertViewSelection } from '../chart_select/helpers';
import { getButtonText, getIconType, onToggle } from './helpers';

interface Props {
  alertViewSelection: AlertViewSelection;
  setShowCountTable: (show: boolean) => void;
  setShowRiskChart: (show: boolean) => void;
  setShowTrendChart: (show: boolean) => void;
  showCountTable: boolean;
  showRiskChart: boolean;
  showTrendChart: boolean;
}

const ViewChartToggleComponent = ({
  alertViewSelection,
  setShowCountTable,
  setShowRiskChart,
  setShowTrendChart,
  showCountTable,
  showRiskChart,
  showTrendChart,
}: Props) => {
  const onClick = useCallback(() => {
    onToggle({
      alertViewSelection,
      setShowCountTable,
      setShowRiskChart,
      setShowTrendChart,
      showCountTable,
      showRiskChart,
      showTrendChart,
    });
  }, [
    alertViewSelection,
    setShowCountTable,
    setShowRiskChart,
    setShowTrendChart,
    showCountTable,
    showRiskChart,
    showTrendChart,
  ]);

  const buttonText = getButtonText({ alertViewSelection, showRiskChart, showTrendChart });

  return (
    <EuiButtonEmpty
      aria-label={buttonText}
      data-test-subj="viewChartToggle"
      onClick={onClick}
      iconType={getIconType({ alertViewSelection, showRiskChart, showTrendChart })}
      size="xs"
    >
      {buttonText}
    </EuiButtonEmpty>
  );
};

ViewChartToggleComponent.displayName = 'ViewChartToggleComponent';

export const ViewChartToggle = React.memo(ViewChartToggleComponent);
