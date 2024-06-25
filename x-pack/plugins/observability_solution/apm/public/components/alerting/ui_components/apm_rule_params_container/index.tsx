/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFlexGrid, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { getTimeUnitLabel, TIME_UNITS } from '@kbn/triggers-actions-ui-plugin/public';

interface MinimumWindowSize {
  value: number;
  unit: TIME_UNITS;
}

interface Props {
  setRuleParams: (key: string, value: any) => void;
  setRuleProperty: (key: string, value: any) => void;
  defaultParams: Record<string, any>;
  fields: React.ReactNode[];
  groupAlertsBy?: React.ReactNode;
  kqlFilter?: React.ReactNode;
  chartPreview?: React.ReactNode;
  minimumWindowSize?: MinimumWindowSize;
}

export function ApmRuleParamsContainer(props: Props) {
  const {
    fields,
    groupAlertsBy,
    kqlFilter,
    setRuleParams,
    defaultParams,
    chartPreview,
    minimumWindowSize,
  } = props;

  const params: Record<string, any> = {
    ...defaultParams,
  };

  const showMinimumWindowSizeWarning = useShowMinimumWindowSize({
    windowSize: params.windowSize,
    windowUnit: params.windowUnit,
    minimumWindowSize,
  });

  useEffect(() => {
    // we only want to run this on mount to set default values
    Object.keys(params).forEach((key) => {
      setRuleParams(key, params[key]);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      {showMinimumWindowSizeWarning && minimumWindowSize && (
        <MinimumWindowSizeWarning minimumWindowSize={minimumWindowSize} />
      )}
      {kqlFilter}
      <EuiFlexGrid gutterSize="l" direction="row" columns={2}>
        {fields.map((field, index) => (
          <EuiFlexItem grow={false} key={index}>
            {field}
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
      {chartPreview}
      <EuiSpacer size="m" />
      {groupAlertsBy}
    </>
  );
}

function MinimumWindowSizeWarning({ minimumWindowSize }: { minimumWindowSize: MinimumWindowSize }) {
  const description = i18n.translate('xpack.apm.alertTypes.minimumWindowSize.description', {
    defaultMessage:
      'The recommended minimum value is {sizeValue} {sizeUnit}. This is to ensure that the alert has enough data to evaluate. If you choose a value that is too low, the alert may not fire as expected.',
    values: {
      sizeValue: minimumWindowSize.value,
      sizeUnit: getTimeUnitLabel(minimumWindowSize.unit),
    },
  });

  return (
    <EuiCallOut
      title={`Please increase "For the last" to at least ${
        minimumWindowSize.value
      } ${getTimeUnitLabel(minimumWindowSize.unit)}`}
      color="warning"
      iconType="warning"
    >
      <p>{description}</p>
    </EuiCallOut>
  );
}

function useShowMinimumWindowSize({
  windowSize,
  windowUnit,
  minimumWindowSize,
}: {
  windowSize?: number;
  windowUnit?: TIME_UNITS;
  minimumWindowSize?: MinimumWindowSize;
}) {
  const [showMinimumWindowSizeWarning, setShowMinimumWindowSizeWarning] = useState(false);

  useEffect(() => {
    if (windowSize === undefined || minimumWindowSize === undefined) {
      return;
    }

    const currentWindowSize = moment.duration(windowSize, windowUnit).asMilliseconds();
    const minimumWindowSizeAsMillis = moment
      .duration(minimumWindowSize.value, minimumWindowSize.unit)
      .asMilliseconds();

    const shouldShow = currentWindowSize < minimumWindowSizeAsMillis;
    setShowMinimumWindowSizeWarning(shouldShow);
  }, [windowSize, windowUnit, minimumWindowSize]);

  return showMinimumWindowSizeWarning;
}
