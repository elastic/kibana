/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useStateToaster } from '../../../../common/components/toasters';
import { useUpdateRulesCache } from '../../../containers/detection_engine/rules/use_find_rules_query';
import { enableRulesAction } from '../../../pages/detection_engine/rules/all/actions';
import { useRulesTableContextOptional } from '../../../pages/detection_engine/rules/all/rules_table/rules_table_context';

const StaticSwitch = styled(EuiSwitch)`
  .euiSwitch__thumb,
  .euiSwitch__icon {
    transition: none;
  }
`;

StaticSwitch.displayName = 'StaticSwitch';

export interface RuleSwitchProps {
  id: string;
  enabled: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  onChange?: (enabled: boolean) => void;
}

/**
 * Basic switch component for displaying loader when enabled/disabled
 */
export const RuleSwitchComponent = ({
  id,
  isDisabled,
  isLoading,
  enabled,
  onChange,
}: RuleSwitchProps) => {
  const [myIsLoading, setMyIsLoading] = useState(false);
  const [, dispatchToaster] = useStateToaster();
  const rulesTableContext = useRulesTableContextOptional();
  const updateRulesCache = useUpdateRulesCache();

  const onRuleStateChange = useCallback(
    async (event: EuiSwitchEvent) => {
      setMyIsLoading(true);
      const rules = await enableRulesAction(
        [id],
        event.target.checked,
        dispatchToaster,
        rulesTableContext?.actions.setLoadingRules
      );
      if (rules?.[0]) {
        updateRulesCache(rules);
        onChange?.(rules[0].enabled);
      }
      setMyIsLoading(false);
    },
    [dispatchToaster, id, onChange, rulesTableContext?.actions.setLoadingRules, updateRulesCache]
  );

  const showLoader = useMemo((): boolean => {
    if (myIsLoading !== isLoading) {
      return isLoading || myIsLoading;
    }

    return myIsLoading;
  }, [myIsLoading, isLoading]);

  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceAround">
      <EuiFlexItem grow={false}>
        {showLoader ? (
          <EuiLoadingSpinner size="m" data-test-subj="ruleSwitchLoader" />
        ) : (
          <StaticSwitch
            data-test-subj="ruleSwitch"
            label={undefined}
            disabled={isDisabled}
            checked={enabled}
            onChange={onRuleStateChange}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const RuleSwitch = React.memo(RuleSwitchComponent);

RuleSwitch.displayName = 'RuleSwitch';
