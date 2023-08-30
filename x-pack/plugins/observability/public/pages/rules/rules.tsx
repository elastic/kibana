/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Route, Routes } from '@kbn/shared-ux-router';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useLoadRuleTypes } from '@kbn/triggers-actions-ui-plugin/public';
import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';

import { RULES_LOGS_PATH, RULES_PATH } from '../../../common/locators/paths';
import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useGetFilteredRuleTypes } from '../../hooks/use_get_filtered_rule_types';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';
import { RulesTab } from './rules_tab';

const GlobalLogsTab = lazy(() => import('./global_logs_tab'));

const RULES_TAB_NAME = 'rules';

interface RulesPageProps {
  activeTab?: string;
}
export function RulesPage({ activeTab = RULES_TAB_NAME }: RulesPageProps) {
  const {
    http,
    docLinks,
    triggersActionsUi: { getAddRuleFlyout: AddRuleFlyout, getRulesSettingsLink: RulesSettingsLink },
  } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();
  const history = useHistory();
  const [addRuleFlyoutVisibility, setAddRuleFlyoutVisibility] = useState(false);
  const [stateRefresh, setRefresh] = useState(new Date());

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
        defaultMessage: 'Alerts',
      }),
      href: http.basePath.prepend('/app/observability/alerts'),
    },
    {
      text: i18n.translate('xpack.observability.breadcrumbs.rulesLinkText', {
        defaultMessage: 'Rules',
      }),
    },
  ]);

  const filteredRuleTypes = useGetFilteredRuleTypes();
  const { ruleTypes } = useLoadRuleTypes({
    filteredRuleTypes,
  });

  const authorizedRuleTypes = [...ruleTypes.values()];
  const authorizedToCreateAnyRules = authorizedRuleTypes.some(
    (ruleType) => ruleType.authorizedConsumers[ALERTS_FEATURE_ID]?.all
  );

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
            onClick={() => setAddRuleFlyoutVisibility(true)}
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
          <Routes>
            <Route
              exact
              path={RULES_PATH}
              render={() => <RulesTab setRefresh={setRefresh} stateRefresh={stateRefresh} />}
            />
            <Route exact path={RULES_LOGS_PATH} component={GlobalLogsTab} />
          </Routes>
        </EuiFlexItem>
      </EuiFlexGroup>

      {addRuleFlyoutVisibility && (
        <AddRuleFlyout
          consumer={ALERTS_FEATURE_ID}
          filteredRuleTypes={filteredRuleTypes}
          onClose={() => {
            setAddRuleFlyoutVisibility(false);
          }}
          onSave={() => {
            setRefresh(new Date());
            return Promise.resolve();
          }}
        />
      )}
    </ObservabilityPageTemplate>
  );
}
