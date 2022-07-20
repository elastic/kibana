/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import {
  getPrePackagedRuleStatus,
  getPrePackagedTimelineStatus,
} from '../../../pages/detection_engine/rules/helpers';
import * as i18n from './translations';
import { useInstallPrePackagedRules } from './use_install_pre_packaged_rules';
import type { PrePackagedRulesStatusResponse } from './use_pre_packaged_rules_status';
import { usePrePackagedRulesStatus } from './use_pre_packaged_rules_status';

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

interface ReturnPrePackagedRules {
  createPrePackagedRules: () => void;
  loading: boolean;
  loadingCreatePrePackagedRules: boolean;
  getLoadPrebuiltRulesAndTemplatesButton: GetLoadPrebuiltRulesAndTemplatesButton;
  getReloadPrebuiltRulesAndTemplatesButton: GetReloadPrebuiltRulesAndTemplatesButton;
}

export type ReturnPrePackagedRulesAndTimelines = ReturnPrePackagedRules &
  Partial<PrePackagedRulesStatusResponse>;

interface UsePrePackagedRuleProps {
  canUserCRUD: boolean | null;
  hasIndexWrite: boolean | null;
  isAuthenticated: boolean | null;
  hasEncryptionKey: boolean | null;
  isSignalIndexExists: boolean | null;
}

/**
 * Hook for using to get status about pre-packaged Rules from the Detection Engine API
 *
 * @param hasIndexWrite boolean
 * @param isAuthenticated boolean
 * @param hasEncryptionKey boolean
 * @param isSignalIndexExists boolean
 *
 */
export const usePrePackagedRules = ({
  canUserCRUD,
  hasIndexWrite,
  isAuthenticated,
  hasEncryptionKey,
  isSignalIndexExists,
}: UsePrePackagedRuleProps): ReturnPrePackagedRulesAndTimelines => {
  const { data: prePackagedRulesStatus, isFetching } = usePrePackagedRulesStatus();
  const { mutate: installPrePackagedRules, isLoading: loadingCreatePrePackagedRules } =
    useInstallPrePackagedRules();

  const createPrePackagedRules = useCallback(() => {
    if (
      canUserCRUD &&
      hasIndexWrite &&
      isAuthenticated &&
      hasEncryptionKey &&
      isSignalIndexExists
    ) {
      installPrePackagedRules();
    }
  }, [
    canUserCRUD,
    hasEncryptionKey,
    hasIndexWrite,
    installPrePackagedRules,
    isAuthenticated,
    isSignalIndexExists,
  ]);

  const prePackagedAssetsStatus = useMemo(
    () =>
      getPrePackagedRuleStatus(
        prePackagedRulesStatus?.rulesInstalled,
        prePackagedRulesStatus?.rulesNotInstalled,
        prePackagedRulesStatus?.rulesNotUpdated
      ),
    [
      prePackagedRulesStatus?.rulesInstalled,
      prePackagedRulesStatus?.rulesNotInstalled,
      prePackagedRulesStatus?.rulesNotUpdated,
    ]
  );

  const prePackagedTimelineStatus = useMemo(
    () =>
      getPrePackagedTimelineStatus(
        prePackagedRulesStatus?.timelinesInstalled,
        prePackagedRulesStatus?.timelinesNotInstalled,
        prePackagedRulesStatus?.timelinesNotUpdated
      ),
    [
      prePackagedRulesStatus?.timelinesInstalled,
      prePackagedRulesStatus?.timelinesNotInstalled,
      prePackagedRulesStatus?.timelinesNotUpdated,
    ]
  );
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
    ...prePackagedRulesStatus,
  };
};
