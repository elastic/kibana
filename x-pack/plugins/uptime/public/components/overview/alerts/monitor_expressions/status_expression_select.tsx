/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiCheckbox } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { DownNoExpressionSelect } from './down_number_select';
import { TimeExpressionSelect } from './time_expression_select';
import { statusExpLabels } from './translations';

interface Props {
  alertParams: { [param: string]: any };
  hasFilters: boolean;
  setAlertParams: (key: string, value: any) => void;
}

export const StatusExpressionSelect: React.FC<Props> = ({
  alertParams,
  hasFilters,
  setAlertParams,
}) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(alertParams.shouldCheckStatus ?? true);

  useEffect(() => {
    setAlertParams('shouldCheckStatus', isEnabled);
  }, [isEnabled, setAlertParams]);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiCheckbox
          id="statusEnabled"
          label={statusExpLabels.ENABLED_CHECKBOX}
          checked={isEnabled}
          onChange={() => setIsEnabled(!isEnabled)}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <DownNoExpressionSelect
          defaultNumTimes={alertParams.numTimes}
          hasFilters={hasFilters}
          isEnabled={isEnabled}
          setAlertParams={setAlertParams}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <TimeExpressionSelect
          defaultTimerangeUnit={alertParams.timerangeUnit}
          defaultTimerangeCount={alertParams.timerangeCount}
          isEnabled={isEnabled}
          setAlertParams={setAlertParams}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
