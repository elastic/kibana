/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useParams } from 'react-router-dom';
import { EuiEmptyPrompt, EuiPanel, EuiSpacer } from '@elastic/eui';

import { ALERT_RULE_TYPE_ID, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { RuleTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { getTimeZone } from '../../../utils/get_time_zone';
import { useFetchRule } from '../../../hooks/use_fetch_rule';
import { isAlertDetailsEnabledPerApp } from '../../../utils/is_alert_details_enabled';
import { useKibana } from '../../../utils/kibana_react';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { useBreadcrumbs } from '../../../hooks/use_breadcrumbs';
import { useFetchAlertDetail } from '../../../hooks/use_fetch_alert_detail';

import { AlertSummary, HeaderActions, PageTitle } from '.';
import { CenterJustifiedSpinner } from '../../rule_details/components/center_justified_spinner';
import PageNotFound from '../../404';

import { ObservabilityAppServices } from '../../../application/types';
import { AlertDetailsPathParams } from '../types';
import { observabilityFeatureId } from '../../../../common';
import { paths } from '../../../config/paths';

export function AlertDetails() {
  const {
    uiSettings,
    http,
    cases: {
      helpers: { canUseCases },
      ui: { getCasesContext },
    },
    triggersActionsUi: { ruleTypeRegistry },
  } = useKibana<ObservabilityAppServices>().services;

  const { ObservabilityPageTemplate, config } = usePluginContext();
  const { alertId } = useParams<AlertDetailsPathParams>();
  const [isLoading, alert] = useFetchAlertDetail(alertId);
  const [ruleTypeModel, setRuleTypeModel] = useState<RuleTypeModel | null>(null);
  const CasesContext = getCasesContext();
  const userCasesPermissions = canUseCases();
  const { rule } = useFetchRule({
    ruleId: alert?.fields[ALERT_RULE_UUID],
    http,
  });

  useEffect(() => {
    if (alert) {
      setRuleTypeModel(ruleTypeRegistry.get(alert?.fields[ALERT_RULE_TYPE_ID]!));
    }
  }, [alert, ruleTypeRegistry]);
  useBreadcrumbs([
    {
      href: http.basePath.prepend(paths.observability.alerts),
      text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
        defaultMessage: 'Alerts',
      }),
    },
  ]);

  if (isLoading) {
    return <CenterJustifiedSpinner />;
  }

  // Redirect to the the 404 page when the user hit the page url directly in the browser while the feature flag is off.
  if (alert && !isAlertDetailsEnabledPerApp(alert, config)) {
    return <PageNotFound />;
  }

  if (!isLoading && !alert)
    return (
      <EuiPanel data-test-subj="alertDetailsError">
        <EuiEmptyPrompt
          iconType="alert"
          color="danger"
          title={
            <h2>
              {i18n.translate('xpack.observability.alertDetails.errorPromptTitle', {
                defaultMessage: 'Unable to load alert details',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.observability.alertDetails.errorPromptBody', {
                defaultMessage: 'There was an error loading the alert details.',
              })}
            </p>
          }
        />
      </EuiPanel>
    );
  const AlertDetailsAppSection = ruleTypeModel ? ruleTypeModel.alertDetailsAppSection : null;
  const timeZone = getTimeZone(uiSettings);
  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: <PageTitle title={alert?.reason} active={Boolean(alert?.active)} />,
        rightSideItems: [
          <CasesContext
            owner={[observabilityFeatureId]}
            permissions={userCasesPermissions}
            features={{ alerts: { sync: false } }}
          >
            <HeaderActions alert={alert} />
          </CasesContext>,
        ],
        bottomBorder: false,
      }}
      data-test-subj="alertDetails"
    >
      <AlertSummary alert={alert} />
      <EuiSpacer size="l" />
      {AlertDetailsAppSection && rule && (
        <AlertDetailsAppSection alert={alert} rule={rule} timeZone={timeZone} />
      )}
    </ObservabilityPageTemplate>
  );
}
