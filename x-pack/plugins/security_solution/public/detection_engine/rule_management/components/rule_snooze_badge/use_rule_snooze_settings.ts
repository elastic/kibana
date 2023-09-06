/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleSnoozeSettings } from '@kbn/triggers-actions-ui-plugin/public/types';
import { useFetchRulesSnoozeSettingsQuery } from '../../api/hooks/use_fetch_rules_snooze_settings_query';
import { useRulesTableContextOptional } from '../../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import * as i18n from './translations';

interface UseRuleSnoozeSettingsResult {
  snoozeSettings?: RuleSnoozeSettings;
  error?: string;
}

export function useRuleSnoozeSettings(id: string): UseRuleSnoozeSettingsResult {
  const {
    state: { rulesSnoozeSettings: rulesTableSnoozeSettings },
  } = useRulesTableContextOptional() ?? { state: {} };
  const {
    data: rulesSnoozeSettings,
    isFetching: isSingleSnoozeSettingsFetching,
    isError: isSingleSnoozeSettingsError,
  } = useFetchRulesSnoozeSettingsQuery([id], {
    enabled: !rulesTableSnoozeSettings?.data[id] && !rulesTableSnoozeSettings?.isFetching,
  });
  const snoozeSettings = rulesTableSnoozeSettings?.data[id] ?? rulesSnoozeSettings?.[id];
  const isFetching = rulesTableSnoozeSettings?.isFetching || isSingleSnoozeSettingsFetching;
  const isError = rulesTableSnoozeSettings?.isError || isSingleSnoozeSettingsError;

  return {
    snoozeSettings,
    error:
      isError || (!snoozeSettings && !isFetching)
        ? i18n.UNABLE_TO_FETCH_RULES_SNOOZE_SETTINGS
        : undefined,
  };
}
