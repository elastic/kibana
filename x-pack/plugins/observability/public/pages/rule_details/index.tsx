/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { deleteRules } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  CenterJustifiedSpinner,
  DeleteConfirmationModal,
  PageTitle,
  HeaderActions,
  RuleLoadingError,
  RuleDetailTabs,
} from './components';
import { RuleDetailsPathParams } from './types';
import { ObservabilityAppServices } from '../../application/types';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { useGetFilteredRuleTypes } from '../../hooks/use_get_filtered_rule_types';
import { useGetRuleTypeDefinitionFromRuleType } from '../../hooks/use_get_rule_type_definition_from_rule_type';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { getHealthColor, getStatusMessage, useIsRuleEditable } from './utils';
import { paths } from '../../config/paths';
import { RULES_BREADCRUMB_TEXT } from '../rules/translations';

export function RuleDetailsPage() {
  const {
    application: { capabilities, navigateToUrl },
    http,
    notifications: { toasts },
    triggersActionsUi: {
      actionTypeRegistry,
      ruleTypeRegistry,
      getEditAlertFlyout: EditAlertFlyout,
      getRuleAlertsSummary: RuleAlertsSummary,
      getRuleStatusPanel: RuleStatusPanel,
      getRuleDefinition: RuleDefinition,
    },
  } = useKibana<ObservabilityAppServices>().services;

  const { ObservabilityPageTemplate } = usePluginContext();

  const { ruleId } = useParams<RuleDetailsPathParams>();

  const { rule, isRuleLoading, errorRule, reloadRule } = useFetchRule({ http, ruleId });
  const filteredRuleTypes = useGetFilteredRuleTypes();

  const ruleTypeDefinition = useGetRuleTypeDefinitionFromRuleType({ ruleTypeId: rule?.ruleTypeId });

  const isRuleEditable = useIsRuleEditable({
    capabilities,
    rule,
    ruleType: ruleTypeDefinition,
    ruleTypeRegistry,
  });

  const [editRuleFlyoutVisible, setEditRuleFlyoutVisible] = useState<boolean>(false);

  const [ruleToDelete, setRuleToDelete] = useState<string | undefined>(undefined);
  const [isRuleDeleting, setIsRuleDeleting] = useState(false);

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
        defaultMessage: 'Alerts',
      }),
      href: http.basePath.prepend(paths.observability.alerts),
    },
    {
      href: http.basePath.prepend(paths.observability.rules),
      text: RULES_BREADCRUMB_TEXT,
    },
    {
      text: rule?.name,
    },
  ]);

  const handleEditRule = () => {
    setEditRuleFlyoutVisible(true);
  };

  const handleDeleteRule = () => {
    if (rule) {
      setRuleToDelete(rule.id);
    }
    setEditRuleFlyoutVisible(false);
  };

  if (errorRule) {
    toasts.addDanger({ title: errorRule });
  }

  return (
    <>
      {isRuleLoading ? <CenterJustifiedSpinner /> : null}

      {errorRule && !rule ? (
        <RuleLoadingError />
      ) : rule ? (
        <ObservabilityPageTemplate
          data-test-subj="ruleDetails"
          pageHeader={{
            pageTitle: <PageTitle rule={rule} />,
            bottomBorder: false,
            rightSideItems: isRuleEditable
              ? [
                  <HeaderActions
                    ruleId={rule.id}
                    loading={isRuleLoading || isRuleDeleting}
                    onEditRule={handleEditRule}
                    onDeleteRule={handleDeleteRule}
                  />,
                ]
              : undefined,
          }}
        >
          <EuiFlexGroup wrap={true} gutterSize="m">
            <EuiFlexItem style={{ minWidth: 350 }}>
              <RuleStatusPanel
                healthColor={getHealthColor(rule.executionStatus.status)}
                isEditable={isRuleEditable}
                requestRefresh={reloadRule}
                rule={rule}
                statusMessage={getStatusMessage(rule)}
              />
            </EuiFlexItem>

            <EuiSpacer size="m" />

            <EuiFlexItem style={{ minWidth: 350 }}>
              <RuleAlertsSummary rule={rule} filteredRuleTypes={filteredRuleTypes} />
            </EuiFlexItem>

            <EuiSpacer size="m" />

            <RuleDefinition
              actionTypeRegistry={actionTypeRegistry}
              rule={rule}
              ruleTypeRegistry={ruleTypeRegistry}
              onEditRule={reloadRule}
            />
          </EuiFlexGroup>

          <EuiSpacer size="l" />

          <RuleDetailTabs rule={rule} ruleType={ruleTypeDefinition} />

          {editRuleFlyoutVisible && (
            <EditAlertFlyout
              initialRule={rule}
              onClose={() => {
                setEditRuleFlyoutVisible(false);
              }}
              onSave={reloadRule}
            />
          )}

          <DeleteConfirmationModal
            apiDeleteCall={deleteRules}
            idToDelete={ruleToDelete}
            title={rule.name}
            onDeleting={() => setIsRuleDeleting(true)}
            onDeleted={() => {
              setRuleToDelete(undefined);
              navigateToUrl(http.basePath.prepend(paths.observability.rules));
            }}
            onErrors={() => {
              setRuleToDelete(undefined);
              navigateToUrl(http.basePath.prepend(paths.observability.rules));
            }}
            onCancel={() => setRuleToDelete(undefined)}
          />
        </ObservabilityPageTemplate>
      ) : null}
    </>
  );
}
