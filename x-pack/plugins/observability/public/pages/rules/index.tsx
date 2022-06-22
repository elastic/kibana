/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiTableSortingType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { RuleTableItem, useLoadRuleTypes } from '@kbn/triggers-actions-ui-plugin/public';
import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { Provider, rulesPageStateContainer, useRulesPageStateContainer } from './state_container';

import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useKibana } from '../../utils/kibana_react';
import { useFetchRules } from '../../hooks/use_fetch_rules';
import { NoDataPrompt } from './components/prompts/no_data_prompt';
import { NoPermissionPrompt } from './components/prompts/no_permission_prompt';
import { CenterJustifiedSpinner } from './components/center_justified_spinner';
import { Pagination } from './types';
import { DEFAULT_SEARCH_PAGE_SIZE, OBSERVABILITY_SOLUTIONS } from './config';
import { RULES_PAGE_TITLE, RULES_BREADCRUMB_TEXT } from './translations';

function RulesPage() {
  const { ObservabilityPageTemplate, observabilityRuleTypeRegistry } = usePluginContext();
  const { http, docLinks, triggersActionsUi } = useKibana().services;

  const documentationLink = docLinks.links.observability.createAlerts;
  const [page, setPage] = useState<Pagination>({ index: 0, size: DEFAULT_SEARCH_PAGE_SIZE });
  const [sort] = useState<EuiTableSortingType<RuleTableItem>['sort']>({
    field: 'name',
    direction: 'asc',
  });
  const [searchText] = useState<string | undefined>();
  const [tagsFilter] = useState<string[]>([]);
  const [typesFilter] = useState<string[]>([]);
  const { lastResponse } = useRulesPageStateContainer();
  const { status } = useRulesPageStateContainer();
  const [createRuleFlyoutVisibility, setCreateRuleFlyoutVisibility] = useState(false);

  const { rulesState, reload, noData, initialLoad } = useFetchRules({
    searchText,
    ruleLastResponseFilter: lastResponse,
    ruleStatusesFilter: status,
    typesFilter,
    tagsFilter,
    page,
    setPage,
    sort,
  });

  const { ruleTypes } = useLoadRuleTypes({
    filteredSolutions: OBSERVABILITY_SOLUTIONS,
  });
  const authorizedRuleTypes = [...ruleTypes.values()];

  const authorizedToCreateAnyRules = authorizedRuleTypes.some(
    (ruleType) => ruleType.authorizedConsumers[ALERTS_FEATURE_ID]?.all
  );

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
        defaultMessage: 'Alerts',
      }),
      href: http.basePath.prepend('/app/observability/alerts'),
    },
    {
      text: RULES_BREADCRUMB_TEXT,
    },
  ]);

  const CreateRuleFlyout = useMemo(
    () =>
      triggersActionsUi.getAddAlertFlyout({
        consumer: ALERTS_FEATURE_ID,
        onClose: () => {
          setCreateRuleFlyoutVisibility(false);
          reload();
        },
        filteredSolutions: OBSERVABILITY_SOLUTIONS,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const getRulesTable = () => {
    if (noData && !rulesState.isLoading) {
      return authorizedToCreateAnyRules ? (
        <NoDataPrompt
          documentationLink={documentationLink}
          onCTAClicked={() => setCreateRuleFlyoutVisibility(true)}
        />
      ) : (
        <NoPermissionPrompt />
      );
    }
    if (initialLoad) {
      return <CenterJustifiedSpinner />;
    }
    return (
      <>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            {triggersActionsUi.getRulesList({
              filteredRulesTypes: observabilityRuleTypeRegistry.list(),
              filteredSolutions: OBSERVABILITY_SOLUTIONS,
              showActionFilter: false,
              ruleDetailsLink: 'alerts/rules/:ruleId',
              showCreateRuleButton: false,
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  };
  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: <>{RULES_PAGE_TITLE}</>,
        rightSideItems: [
          authorizedToCreateAnyRules && (
            <EuiButton
              iconType="plusInCircle"
              key="create-alert"
              data-test-subj="createRuleButton"
              fill
              onClick={() => setCreateRuleFlyoutVisibility(true)}
            >
              <FormattedMessage
                id="xpack.observability.rules.addRuleButtonLabel"
                defaultMessage="Create rule"
              />
            </EuiButton>
          ),
          <EuiButtonEmpty
            href={documentationLink}
            target="_blank"
            iconType="help"
            data-test-subj="documentationLink"
          >
            <FormattedMessage
              id="xpack.observability.rules.docsLinkText"
              defaultMessage="Documentation"
            />
          </EuiButtonEmpty>,
        ],
      }}
    >
      {getRulesTable()}
      {createRuleFlyoutVisibility && CreateRuleFlyout}
    </ObservabilityPageTemplate>
  );
}

function WrappedRulesPage() {
  return (
    <Provider value={rulesPageStateContainer}>
      <RulesPage />
    </Provider>
  );
}

export { WrappedRulesPage as RulesPage };
