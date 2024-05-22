/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTab,
  EuiTabs,
  EuiTitle,
  EuiDescriptionList,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSwitch,
  EuiFlyoutFooter,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { HttpSetup } from '@kbn/core/public';
import { useKibana } from '../../common/hooks/use_kibana';
import { getFindingsDetectionRuleSearchTags } from '../../../common/utils/detection_rules';
import { CspBenchmarkRuleMetadata } from '../../../common/types/latest';
import { getRuleList } from '../configurations/findings_flyout/rule_tab';
import { getRemediationList } from '../configurations/findings_flyout/overview_tab';
import * as TEST_SUBJECTS from './test_subjects';
import { useChangeCspRuleState } from './use_change_csp_rule_state';
import { CspBenchmarkRulesWithStates } from './rules_container';
import {
  showChangeBenchmarkRuleStatesSuccessToast,
  TakeAction,
} from '../../components/take_action';
import { useFetchDetectionRulesByTags } from '../../common/api/use_fetch_detection_rules_by_tags';
import { createDetectionRuleFromBenchmarkRule } from '../configurations/utils/create_detection_rule_from_benchmark';

export const RULES_FLYOUT_SWITCH_BUTTON = 'rule-flyout-switch-button';

interface RuleFlyoutProps {
  onClose(): void;
  rule: CspBenchmarkRulesWithStates;
}

const tabs = [
  {
    label: i18n.translate('xpack.csp.rules.ruleFlyout.overviewTabLabel', {
      defaultMessage: 'Overview',
    }),
    id: 'overview',
    disabled: false,
  },
  {
    label: i18n.translate('xpack.csp.rules.ruleFlyout.remediationTabLabel', {
      defaultMessage: 'Remediation',
    }),
    id: 'remediation',
    disabled: false,
  },
] as const;

type RuleTab = typeof tabs[number]['id'];

export const RuleFlyout = ({ onClose, rule }: RuleFlyoutProps) => {
  const [tab, setTab] = useState<RuleTab>('overview');
  const { mutate: mutateRuleState } = useChangeCspRuleState();
  const { data: rulesData } = useFetchDetectionRulesByTags(
    getFindingsDetectionRuleSearchTags(rule.metadata)
  );
  const { notifications, analytics, i18n: i18nStart, theme } = useKibana().services;
  const startServices = { notifications, analytics, i18n: i18nStart, theme };
  const isRuleMuted = rule?.state === 'muted';

  const switchRuleStates = async () => {
    if (rule.metadata.benchmark.rule_number) {
      const rulesObjectRequest = {
        benchmark_id: rule.metadata.benchmark.id,
        benchmark_version: rule.metadata.benchmark.version,
        rule_number: rule.metadata.benchmark.rule_number,
        rule_id: rule.metadata.id,
      };
      const nextRuleStates = isRuleMuted ? 'unmute' : 'mute';
      await mutateRuleState({
        newState: nextRuleStates,
        ruleIds: [rulesObjectRequest],
      });
      showChangeBenchmarkRuleStatesSuccessToast(startServices, isRuleMuted, {
        numberOfRules: 1,
        numberOfDetectionRules: rulesData?.total || 0,
      });
    }
  };

  const createMisconfigurationRuleFn = async (http: HttpSetup) =>
    await createDetectionRuleFromBenchmarkRule(http, rule.metadata);

  return (
    <EuiFlyout
      ownFocus={false}
      onClose={onClose}
      data-test-subj={TEST_SUBJECTS.CSP_RULES_FLYOUT_CONTAINER}
      outsideClickCloses
    >
      <EuiFlyoutHeader>
        <EuiTitle size="l">
          <h2>{rule.metadata.name}</h2>
        </EuiTitle>
        <EuiTabs>
          {tabs.map((item) => (
            <EuiTab
              key={item.id}
              isSelected={tab === item.id}
              onClick={() => setTab(item.id)}
              disabled={item.disabled}
            >
              {item.label}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {tab === 'overview' && (
          <RuleOverviewTab
            rule={rule.metadata}
            ruleData={rule}
            switchRuleStates={switchRuleStates}
          />
        )}
        {tab === 'remediation' && (
          <EuiDescriptionList compressed={false} listItems={getRemediationList(rule.metadata)} />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup gutterSize="none" direction="rowReverse">
          <EuiFlexItem grow={false}>
            {isRuleMuted ? (
              <TakeAction
                enableBenchmarkRuleFn={switchRuleStates}
                createRuleFn={createMisconfigurationRuleFn}
                isCreateDetectionRuleDisabled={true}
              />
            ) : (
              <TakeAction
                disableBenchmarkRuleFn={switchRuleStates}
                createRuleFn={createMisconfigurationRuleFn}
                isCreateDetectionRuleDisabled={false}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

const RuleOverviewTab = ({
  rule,
  ruleData,
  switchRuleStates,
}: {
  rule: CspBenchmarkRuleMetadata;
  ruleData: CspBenchmarkRulesWithStates;
  switchRuleStates: () => Promise<void>;
}) => (
  <EuiFlexGroup direction="column">
    <EuiFlexItem>
      <EuiDescriptionList
        listItems={[...ruleState(ruleData, switchRuleStates), ...getRuleList(rule, ruleData.state)]}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);

const ruleState = (rule: CspBenchmarkRulesWithStates, switchRuleStates: () => Promise<void>) => [
  {
    title: (
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <FormattedMessage
            id="xpack.csp.rules.rulesFlyout.ruleStateSwitchTitle"
            defaultMessage="Enabled"
          />
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          css={{
            '.euiToolTipAnchor': {
              display: 'flex', // needed to align the icon with the title
            },
          }}
        >
          <EuiToolTip
            content={i18n.translate('xpack.csp.rules.rulesFlyout.ruleStateSwitchTooltip', {
              defaultMessage: `Disabling a rule will also disable its associated detection rules and alerts. Enabling it again does not automatically re-enable them`,
            })}
          >
            <EuiIcon size="m" color="subdued" type="iInCircle" />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    description: (
      <>
        <EuiSwitch
          className="eui-textTruncate"
          checked={rule?.state !== 'muted'}
          onChange={switchRuleStates}
          data-test-subj={RULES_FLYOUT_SWITCH_BUTTON}
          label=" "
        />
      </>
    ),
  },
];
