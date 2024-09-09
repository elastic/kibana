/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { RuleTypeModal } from '@kbn/alerts-ui-shared/src/rule_type_modal';
import { ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { useLoadRuleTypesQuery } from '@kbn/triggers-actions-ui-plugin/public';
import React, { lazy, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { observabilityRuleCreationValidConsumers } from '../../../common/constants';
import { RULES_LOGS_PATH, RULES_PATH } from '../../../common/locators/paths';
import { useGetFilteredRuleTypes } from '../../hooks/use_get_filtered_rule_types';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useKibana } from '../../utils/kibana_react';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';
import { RulesTab } from './rules_tab';
import { useGetAvailableRulesWithDescriptions } from '../../hooks/use_get_available_rules_with_descriptions';

const GlobalLogsTab = lazy(() => import('./global_logs_tab'));

const RULES_TAB_NAME = 'rules';

interface RulesPageProps {
  activeTab?: string;
}
export function RulesPage({ activeTab = RULES_TAB_NAME }: RulesPageProps) {
  const {
    http,
    docLinks,
    notifications: { toasts },
    observabilityAIAssistant,
    triggersActionsUi: {
      ruleTypeRegistry,
      getAddRuleFlyout: AddRuleFlyout,
      getRulesSettingsLink: RulesSettingsLink,
    },
  } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();
  const history = useHistory();
  const [ruleTypeModalVisibility, setRuleTypeModalVisibility] = useState<boolean>(false);
  const [ruleTypeIdToCreate, setRuleTypeIdToCreate] = useState<string | undefined>(undefined);
  const [addRuleFlyoutVisibility, setAddRuleFlyoutVisibility] = useState(false);
  const [stateRefresh, setRefresh] = useState(new Date());

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
        defaultMessage: 'Alerts',
      }),
      href: http.basePath.prepend('/app/observability/alerts'),
      deepLinkId: 'observability-overview:alerts',
    },
    {
      text: i18n.translate('xpack.observability.breadcrumbs.rulesLinkText', {
        defaultMessage: 'Rules',
      }),
    },
  ]);

  const filteredRuleTypes = useGetFilteredRuleTypes();
  const {
    ruleTypesState: { data: ruleTypes },
  } = useLoadRuleTypesQuery({
    filteredRuleTypes,
  });

  const authorizedRuleTypes = [...ruleTypes.values()];
  const authorizedToCreateAnyRules = authorizedRuleTypes.some(
    (ruleType) => ruleType.authorizedConsumers[ALERTING_FEATURE_ID]?.all
  );

  const { setScreenContext } = observabilityAIAssistant?.service || {};

  const ruleTypesWithDescriptions = useGetAvailableRulesWithDescriptions();

  useEffect(() => {
    return setScreenContext?.({
      screenDescription: `The rule types that are available are: ${JSON.stringify(
        ruleTypesWithDescriptions
      )}`,
      starterPrompts: [
        {
          title: i18n.translate(
            'xpack.observability.aiAssistant.starterPrompts.explainRules.title',
            {
              defaultMessage: 'Explain',
            }
          ),
          prompt: i18n.translate(
            'xpack.observability.aiAssistant.starterPrompts.explainRules.prompt',
            {
              defaultMessage: `Can you explain the rule types that are available?`,
            }
          ),
          icon: 'sparkles',
        },
      ],
    });
  }, [filteredRuleTypes, ruleTypesWithDescriptions, setScreenContext]);

  const tabs = [
    {
      name: 'rules',
      label: (
        <FormattedMessage id="xpack.observability.rulePage.rulesTabTitle" defaultMessage="Rules" />
      ),
      onClick: () => history.push(RULES_PATH),
      isSelected: activeTab === RULES_TAB_NAME,
    },
    {
      name: 'logs',
      label: (
        <FormattedMessage id="xpack.observability.rulePage.logsTabTitle" defaultMessage="Logs" />
      ),
      onClick: () => history.push(RULES_LOGS_PATH),
      ['data-test-subj']: 'ruleLogsTab',
      isSelected: activeTab !== RULES_TAB_NAME,
    },
  ];

  const rightSideItems = [
    ...(activeTab === RULES_TAB_NAME
      ? [
          <EuiButton
            data-test-subj="createRuleButton"
            disabled={!authorizedToCreateAnyRules}
            fill
            iconType="plusInCircle"
            key="create-alert"
            onClick={() => setRuleTypeModalVisibility(true)}
          >
            <FormattedMessage
              id="xpack.observability.rules.addRuleButtonLabel"
              defaultMessage="Create rule"
            />
          </EuiButton>,
        ]
      : []),
    <RulesSettingsLink />,
    <EuiButtonEmpty
      data-test-subj="documentationLink"
      href={docLinks.links.observability.createAlerts}
      iconType="help"
      target="_blank"
    >
      <FormattedMessage
        id="xpack.observability.rules.docsLinkText"
        defaultMessage="Documentation"
      />
    </EuiButtonEmpty>,
  ];

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: i18n.translate('xpack.observability.rulesTitle', {
          defaultMessage: 'Rules',
        }),
        rightSideItems,
        tabs,
      }}
      data-test-subj="rulesPage"
    >
      <HeaderMenu />
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          {activeTab === RULES_TAB_NAME ? (
            <RulesTab setRefresh={setRefresh} stateRefresh={stateRefresh} />
          ) : (
            <GlobalLogsTab />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>

      {ruleTypeModalVisibility && (
        <RuleTypeModal
          onClose={() => setRuleTypeModalVisibility(false)}
          onSelectRuleType={(ruleTypeId) => {
            setRuleTypeIdToCreate(ruleTypeId);
            setRuleTypeModalVisibility(false);
            setAddRuleFlyoutVisibility(true);
          }}
          http={http}
          toasts={toasts}
          registeredRuleTypes={ruleTypeRegistry.list()}
          filteredRuleTypes={filteredRuleTypes}
        />
      )}

      {addRuleFlyoutVisibility && (
        <AddRuleFlyout
          ruleTypeId={ruleTypeIdToCreate}
          canChangeTrigger={false}
          consumer={ALERTING_FEATURE_ID}
          filteredRuleTypes={filteredRuleTypes}
          validConsumers={observabilityRuleCreationValidConsumers}
          initialSelectedConsumer={AlertConsumers.LOGS}
          onClose={() => {
            setAddRuleFlyoutVisibility(false);
          }}
          onSave={() => {
            setRefresh(new Date());
            return Promise.resolve();
          }}
          hideGrouping
          useRuleProducer
        />
      )}
    </ObservabilityPageTemplate>
  );
}
