/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { useCallback } from 'react';
import * as i18n from './translations';
import { useCreatePrePackagedRules } from './use_create_pre_packaged_rules';
import { usePrePackagedRulesInstallationStatus } from './use_pre_packaged_rules_installation_status';
import { usePrePackagedRulesStatus } from './use_pre_packaged_rules_status';
import { usePrePackagedTimelinesInstallationStatus } from './use_pre_packaged_timelines_installation_status';

type GetLoadPrebuiltRulesAndTemplatesButton = (args: {
  isDisabled: boolean;
  onClick: () => void;
  fill?: boolean;
  'data-test-subj'?: string;
}) => React.ReactNode | null;

type GetReloadPrebuiltRulesAndTemplatesButton = ({
  isDisabled,
  onClick,
  fill,
}: {
  isDisabled: boolean;
  onClick: () => void;
  fill?: boolean;
}) => React.ReactNode | null;

export interface ReturnPrePackagedRulesAndTimelines {
  createPrePackagedRules: () => void;
  loading: boolean;
  loadingCreatePrePackagedRules: boolean;
  getLoadPrebuiltRulesAndTemplatesButton: GetLoadPrebuiltRulesAndTemplatesButton;
  getReloadPrebuiltRulesAndTemplatesButton: GetReloadPrebuiltRulesAndTemplatesButton;
}

/**
 * Hook for using to get status about pre-packaged Rules from the Detection Engine API
 */
export const usePrePackagedRules = (): ReturnPrePackagedRulesAndTimelines => {
  const { data: prePackagedRulesStatus, isFetching } = usePrePackagedRulesStatus();
  const { createPrePackagedRules, isLoading: loadingCreatePrePackagedRules } =
    useCreatePrePackagedRules();
  const prePackagedAssetsStatus = usePrePackagedRulesInstallationStatus();
  const prePackagedTimelineStatus = usePrePackagedTimelinesInstallationStatus();

  // TODO it should be a react component
  const getLoadPrebuiltRulesAndTemplatesButton = useCallback(
    ({ isDisabled, onClick, fill, 'data-test-subj': dataTestSubj = 'loadPrebuiltRulesBtn' }) => {
      return (prePackagedAssetsStatus === 'ruleNotInstalled' ||
        prePackagedTimelineStatus === 'timelinesNotInstalled') &&
        prePackagedAssetsStatus !== 'someRuleUninstall' ? (
        <EuiButton
          fill={fill}
          iconType="indexOpen"
          isLoading={loadingCreatePrePackagedRules}
          isDisabled={isDisabled}
          onClick={onClick}
          data-test-subj={dataTestSubj}
        >
          {prePackagedAssetsStatus === 'ruleNotInstalled' &&
            prePackagedTimelineStatus === 'timelinesNotInstalled' &&
            i18n.LOAD_PREPACKAGED_RULES_AND_TEMPLATES}

          {prePackagedAssetsStatus === 'ruleNotInstalled' &&
            prePackagedTimelineStatus !== 'timelinesNotInstalled' &&
            i18n.LOAD_PREPACKAGED_RULES}

          {prePackagedAssetsStatus !== 'ruleNotInstalled' &&
            prePackagedTimelineStatus === 'timelinesNotInstalled' &&
            i18n.LOAD_PREPACKAGED_TIMELINE_TEMPLATES}
        </EuiButton>
      ) : null;
    },
    [loadingCreatePrePackagedRules, prePackagedAssetsStatus, prePackagedTimelineStatus]
  );

  const getMissingRulesOrTimelinesButtonTitle = useCallback(
    (missingRules: number, missingTimelines: number) => {
      if (missingRules > 0 && missingTimelines === 0)
        return i18n.RELOAD_MISSING_PREPACKAGED_RULES(missingRules);
      else if (missingRules === 0 && missingTimelines > 0)
        return i18n.RELOAD_MISSING_PREPACKAGED_TIMELINES(missingTimelines);
      else if (missingRules > 0 && missingTimelines > 0)
        return i18n.RELOAD_MISSING_PREPACKAGED_RULES_AND_TIMELINES(missingRules, missingTimelines);
    },
    []
  );

  // TODO it should be a react component
  const getReloadPrebuiltRulesAndTemplatesButton = useCallback(
    ({ isDisabled, onClick, fill = false }) => {
      return prePackagedAssetsStatus === 'someRuleUninstall' ||
        prePackagedTimelineStatus === 'someTimelineUninstall' ? (
        <EuiButton
          fill={fill}
          iconType="plusInCircle"
          isLoading={loadingCreatePrePackagedRules}
          isDisabled={isDisabled}
          onClick={onClick}
          data-test-subj="reloadPrebuiltRulesBtn"
        >
          {getMissingRulesOrTimelinesButtonTitle(
            prePackagedRulesStatus?.rulesNotInstalled ?? 0,
            prePackagedRulesStatus?.timelinesNotInstalled ?? 0
          )}
        </EuiButton>
      ) : null;
    },
    [
      getMissingRulesOrTimelinesButtonTitle,
      loadingCreatePrePackagedRules,
      prePackagedAssetsStatus,
      prePackagedRulesStatus?.rulesNotInstalled,
      prePackagedRulesStatus?.timelinesNotInstalled,
      prePackagedTimelineStatus,
    ]
  );

  return {
    loading: isFetching,
    loadingCreatePrePackagedRules,
    createPrePackagedRules,
    getLoadPrebuiltRulesAndTemplatesButton,
    getReloadPrebuiltRulesAndTemplatesButton,
  };
};
