/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiCheckbox } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { DownNoExpressionSelect } from './down_number_select';
import { TimeExpressionSelect } from './time_expression_select';
import { statusExpLabels } from './translations';

interface Props {
  ruleParams: { [param: string]: any };
  hasFilters: boolean;
  setRuleParams: (key: string, value: any) => void;
}

export const StatusExpressionSelect: React.FC<Props> = ({
  ruleParams,
  hasFilters,
  setRuleParams,
}) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(ruleParams.shouldCheckStatus ?? true);

  useEffect(() => {
    setRuleParams('shouldCheckStatus', isEnabled);
  }, [isEnabled, setRuleParams]);

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
          defaultNumTimes={ruleParams.numTimes}
          hasFilters={hasFilters}
          isEnabled={isEnabled}
          setRuleParams={setRuleParams}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <TimeExpressionSelect
          defaultTimerangeUnit={ruleParams.timerangeUnit}
          defaultTimerangeCount={ruleParams.timerangeCount}
          isEnabled={isEnabled}
          setRuleParams={setRuleParams}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
