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
import { noop } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { BulkAction } from '../../../../../common/detection_engine/schemas/common';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useUpdateRulesCache } from '../../../containers/detection_engine/rules/use_find_rules_query';
import { executeRulesBulkAction } from '../../../pages/detection_engine/rules/all/actions';
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
  const rulesTableContext = useRulesTableContextOptional();
  const updateRulesCache = useUpdateRulesCache();
  const toasts = useAppToasts();

  const onRuleStateChange = useCallback(
    async (event: EuiSwitchEvent) => {
      setMyIsLoading(true);
      const bulkActionResponse = await executeRulesBulkAction({
        setLoadingRules: rulesTableContext?.actions.setLoadingRules,
        toasts,
        onSuccess: rulesTableContext ? undefined : noop,
        action: event.target.checked ? BulkAction.enable : BulkAction.disable,
        search: { ids: [id] },
        visibleRuleIds: [],
      });
      if (bulkActionResponse?.attributes.results.updated.length) {
        // The rule was successfully updated
        updateRulesCache(bulkActionResponse.attributes.results.updated);
        onChange?.(bulkActionResponse.attributes.results.updated[0].enabled);
      }
      setMyIsLoading(false);
    },
    [id, onChange, rulesTableContext, toasts, updateRulesCache]
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
