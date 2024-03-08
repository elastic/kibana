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
import {
  AlertStatus,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_STATUS_UNTRACKED,
} from '@kbn/rule-data-utils';
import { RuleTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';

import dedent from 'dedent';
import { useKibana } from '../../utils/kibana_react';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useFetchAlertDetail } from '../../hooks/use_fetch_alert_detail';
import { PageTitle, pageTitleContent } from './components/page_title';
import { HeaderActions } from './components/header_actions';
import { AlertSummary, AlertSummaryField } from './components/alert_summary';
import { CenterJustifiedSpinner } from '../../components/center_justified_spinner';
import PageNotFound from '../404';
import { getTimeZone } from '../../utils/get_time_zone';
import { isAlertDetailsEnabledPerApp } from '../../utils/is_alert_details_enabled';
import { observabilityFeatureId } from '../../../common';
import { paths } from '../../../common/locators/paths';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';

interface AlertDetailsPathParams {
  alertId: string;
}

export const ALERT_DETAILS_PAGE_ID = 'alert-details-o11y';
const defaultBreadcrumb = i18n.translate('xpack.observability.breadcrumbs.alertDetails', {
  defaultMessage: 'Alert details',
});

export const LOG_DOCUMENT_COUNT_RULE_TYPE_ID = 'logs.alert.document.count';
export const METRIC_THRESHOLD_ALERT_TYPE_ID = 'metrics.alert.threshold';
export const METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID = 'metrics.alert.inventory.threshold';

export function AlertDetails() {
  const {
    cases: {
      helpers: { canUseCases },
      ui: { getCasesContext },
    },
    http,
    triggersActionsUi: { ruleTypeRegistry },
    observabilityAIAssistant: {
      service: { setScreenContext },
    },
    uiSettings,
  } = useKibana().services;

  const { ObservabilityPageTemplate, config } = usePluginContext();
  const { alertId } = useParams<AlertDetailsPathParams>();
  const [isLoading, alertDetail] = useFetchAlertDetail(alertId);
  const [ruleTypeModel, setRuleTypeModel] = useState<RuleTypeModel | null>(null);
  const CasesContext = getCasesContext();
  const userCasesPermissions = canUseCases([observabilityFeatureId]);
  const { rule } = useFetchRule({
    ruleId: alertDetail?.formatted.fields[ALERT_RULE_UUID],
  });
  const [summaryFields, setSummaryFields] = useState<AlertSummaryField[]>();
  const [alertStatus, setAlertStatus] = useState<AlertStatus>();

  useEffect(() => {
    if (!alertDetail) {
      return;
    }

    const screenDescription = dedent(`The user is looking at an ${
      alertDetail.formatted.active ? 'active' : 'recovered'
    } alert.
    It started at ${new Date(
      alertDetail.formatted.start
    ).toISOString()}, and was last updated at ${new Date(
      alertDetail.formatted.lastUpdated
    ).toISOString()}.

    ${
      alertDetail.formatted.reason
        ? `The reason given for the alert is ${alertDetail.formatted.reason}.`
        : ''
    }
    `);

    return setScreenContext({
      screenDescription,
      data: [
        {
          name: 'alert_fields',
          description: 'The fields and values for the alert',
          value: alertDetail.formatted.fields,
        },
      ],
    });
  }, [setScreenContext, alertDetail]);

  useEffect(() => {
    if (alertDetail) {
      setRuleTypeModel(ruleTypeRegistry.get(alertDetail?.formatted.fields[ALERT_RULE_TYPE_ID]!));
      setAlertStatus(alertDetail?.formatted?.fields[ALERT_STATUS] as AlertStatus);
    }
  }, [alertDetail, ruleTypeRegistry]);
  useBreadcrumbs([
    {
      href: http.basePath.prepend(paths.observability.alerts),
      text: i18n.translate('xpack.observability.breadcrumbs.alertsLinkText', {
        defaultMessage: 'Alerts',
      }),
      deepLinkId: 'observability-overview:alerts',
    },
    {
      text: alertDetail
        ? pageTitleContent(alertDetail.formatted.fields[ALERT_RULE_CATEGORY])
        : defaultBreadcrumb,
    },
  ]);

  const onUntrackAlert = () => {
    setAlertStatus(ALERT_STATUS_UNTRACKED);
  };

  if (isLoading) {
    return <CenterJustifiedSpinner />;
  }

  // Redirect to the 404 page when the user hit the page url directly in the browser while the feature flag is off.
  if (alertDetail && !isAlertDetailsEnabledPerApp(alertDetail.formatted, config)) {
    return <PageNotFound />;
  }

  if (!isLoading && !alertDetail)
    return (
      <EuiPanel data-test-subj="alertDetailsError">
        <EuiEmptyPrompt
          iconType="warning"
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
        pageTitle: (
          <PageTitle
            alert={alertDetail?.formatted ?? null}
            alertStatus={alertStatus}
            dataTestSubj={rule?.ruleTypeId || 'alertDetailsPageTitle'}
          />
        ),
        rightSideItems: [
          <CasesContext
            owner={[observabilityFeatureId]}
            permissions={userCasesPermissions}
            features={{ alerts: { sync: false } }}
          >
            <HeaderActions
              alert={alertDetail?.formatted ?? null}
              alertStatus={alertStatus}
              onUntrackAlert={onUntrackAlert}
            />
          </CasesContext>,
        ],
        bottomBorder: true,
      }}
      data-test-subj="alertDetails"
    >
      <HeaderMenu />
      <AlertSummary alertSummaryFields={summaryFields} />
      <EuiSpacer size="l" />
      {AlertDetailsAppSection && rule && alertDetail?.formatted && (
        <AlertDetailsAppSection
          alert={alertDetail.formatted}
          rule={rule}
          timeZone={timeZone}
          setAlertSummaryFields={setSummaryFields}
          ruleLink={http.basePath.prepend(paths.observability.ruleDetails(rule.id))}
        />
      )}
    </ObservabilityPageTemplate>
  );
}
