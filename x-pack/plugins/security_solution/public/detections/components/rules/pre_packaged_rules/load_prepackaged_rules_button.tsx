/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import { usePrePackagedRulesInstallationStatus } from '../../../../detection_engine/rule_management/logic/use_pre_packaged_rules_installation_status';
import { usePrePackagedRulesStatus } from '../../../../detection_engine/rule_management/logic/use_pre_packaged_rules_status';
import { usePrePackagedTimelinesInstallationStatus } from '../../../../detection_engine/rule_management/logic/use_pre_packaged_timelines_installation_status';
import { INSTALL_PREBUILT_RULES_ANCHOR } from '../../../../detection_engine/rule_management_ui/components/rules_table/rules_table/guided_onboarding/rules_management_tour';
import type {
  PrePackagedRuleInstallationStatus,
  PrePackagedTimelineInstallationStatus,
} from '../../../pages/detection_engine/rules/helpers';
import * as i18n from './translations';

const getLoadRulesOrTimelinesButtonTitle = (
  rulesStatus: PrePackagedRuleInstallationStatus,
  timelineStatus: PrePackagedTimelineInstallationStatus
) => {
  if (rulesStatus === 'ruleNotInstalled' && timelineStatus === 'timelinesNotInstalled')
    return i18n.LOAD_PREPACKAGED_RULES_AND_TEMPLATES;
  else if (rulesStatus === 'ruleNotInstalled' && timelineStatus !== 'timelinesNotInstalled')
    return i18n.LOAD_PREPACKAGED_RULES;
  else if (rulesStatus !== 'ruleNotInstalled' && timelineStatus === 'timelinesNotInstalled')
    return i18n.LOAD_PREPACKAGED_TIMELINE_TEMPLATES;
};

const getMissingRulesOrTimelinesButtonTitle = (missingRules: number, missingTimelines: number) => {
  if (missingRules > 0 && missingTimelines === 0)
    return i18n.RELOAD_MISSING_PREPACKAGED_RULES(missingRules);
  else if (missingRules === 0 && missingTimelines > 0)
    return i18n.RELOAD_MISSING_PREPACKAGED_TIMELINES(missingTimelines);
  else if (missingRules > 0 && missingTimelines > 0)
    return i18n.RELOAD_MISSING_PREPACKAGED_RULES_AND_TIMELINES(missingRules, missingTimelines);
};

interface LoadPrePackagedRulesButtonProps {
  fill?: boolean;
  'data-test-subj'?: string;
  isLoading: boolean;
  isDisabled: boolean;
  onClick: () => Promise<void>;
}

export const LoadPrePackagedRulesButton = ({
  fill,
  'data-test-subj': dataTestSubj = 'loadPrebuiltRulesBtn',
  isLoading,
  isDisabled,
  onClick,
}: LoadPrePackagedRulesButtonProps) => {
  const { data: prePackagedRulesStatus } = usePrePackagedRulesStatus();
  const prePackagedAssetsStatus = usePrePackagedRulesInstallationStatus();
  const prePackagedTimelineStatus = usePrePackagedTimelinesInstallationStatus();

  const showInstallButton =
    (prePackagedAssetsStatus === 'ruleNotInstalled' ||
      prePackagedTimelineStatus === 'timelinesNotInstalled') &&
    prePackagedAssetsStatus !== 'someRuleUninstall';

  if (showInstallButton) {
    // Without the outer div EuiStepTour crashes with Uncaught DOMException:
    // Failed to execute 'removeChild' on 'Node': The node to be removed is not
    // a child of this node.
    return (
      <div>
        <EuiButton
          id={INSTALL_PREBUILT_RULES_ANCHOR}
          fill={fill}
          iconType="indexOpen"
          isLoading={isLoading}
          isDisabled={isDisabled}
          onClick={onClick}
          data-test-subj={dataTestSubj}
        >
          {getLoadRulesOrTimelinesButtonTitle(prePackagedAssetsStatus, prePackagedTimelineStatus)}
        </EuiButton>
      </div>
    );
  }

  const showUpdateButton =
    prePackagedAssetsStatus === 'someRuleUninstall' ||
    prePackagedTimelineStatus === 'someTimelineUninstall';

  if (showUpdateButton) {
    // Without the outer div EuiStepTour crashes with Uncaught DOMException:
    // Failed to execute 'removeChild' on 'Node': The node to be removed is not
    // a child of this node.
    return (
      <div>
        <EuiButton
          id={INSTALL_PREBUILT_RULES_ANCHOR}
          fill={fill}
          iconType="plusInCircle"
          isLoading={isLoading}
          isDisabled={isDisabled}
          onClick={onClick}
          data-test-subj={dataTestSubj}
        >
          {getMissingRulesOrTimelinesButtonTitle(
            prePackagedRulesStatus?.rules_not_installed ?? 0,
            prePackagedRulesStatus?.timelines_not_installed ?? 0
          )}
        </EuiButton>
      </div>
    );
  }

  return null;
};
