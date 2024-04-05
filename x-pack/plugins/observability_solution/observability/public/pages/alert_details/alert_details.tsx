/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useParams } from 'react-router-dom';
import {
  EuiEmptyPrompt,
  EuiPanel,
  EuiSpacer,
  EuiTabbedContent,
  EuiTabbedContentTab,
  useEuiTheme,
} from '@elastic/eui';
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
import { AlertFieldsTable } from '@kbn/alerts-ui-shared';
import { css } from '@emotion/react';
import { useKibana } from '../../utils/kibana_react';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { AlertData, useFetchAlertDetail } from '../../hooks/use_fetch_alert_detail';
import { PageTitle, pageTitleContent } from './components/page_title';
import { HeaderActions } from './components/header_actions';
import { AlertSummary, AlertSummaryField } from './components/alert_summary';
import { CenterJustifiedSpinner } from '../../components/center_justified_spinner';
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
    observabilityAIAssistant,
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
  const { euiTheme } = useEuiTheme();

  useEffect(() => {
    if (!alertDetail || !observabilityAIAssistant) {
      return;
    }

    const screenDescription = getScreenDescription(alertDetail);

    return observabilityAIAssistant.service.setScreenContext({
      screenDescription,
      data: [
        {
          name: 'alert_fields',
          description: 'The fields and values for the alert',
          value: alertDetail.formatted.fields,
        },
      ],
    });
  }, [observabilityAIAssistant, alertDetail]);

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

  const OVERVIEW_TAB_ID = 'overview';
  const METADATA_TAB_ID = 'metadata';

  const overviewTab =
    AlertDetailsAppSection &&
    alertDetail &&
    isAlertDetailsEnabledPerApp(alertDetail.formatted, config) ? (
      <>
        <EuiSpacer size="l" />
        <AlertSummary alertSummaryFields={summaryFields} />
        {rule && alertDetail?.formatted && (
          <AlertDetailsAppSection
            alert={alertDetail.formatted}
            rule={rule}
            timeZone={timeZone}
            setAlertSummaryFields={setSummaryFields}
            ruleLink={http.basePath.prepend(paths.observability.ruleDetails(rule.id))}
          />
        )}
      </>
    ) : (
      <></>
    );

  const metadataTab = alertDetail?.raw && (
    <EuiPanel hasShadow={false} data-test-subj="metadataTabPanel">
      <AlertFieldsTable alert={alertDetail.raw} />
    </EuiPanel>
  );

  const tabs: EuiTabbedContentTab[] = [
    {
      id: OVERVIEW_TAB_ID,
      name: i18n.translate('xpack.observability.alertDetails.tab.overviewLabel', {
        defaultMessage: 'Overview',
      }),
      'data-test-subj': 'overviewTab',
      content: overviewTab,
    },
    {
      id: METADATA_TAB_ID,
      name: i18n.translate('xpack.observability.alertDetails.tab.metadataLabel', {
        defaultMessage: 'Metadata',
      }),
      'data-test-subj': 'metadataTab',
      content: metadataTab,
    },
  ];

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
        bottomBorder: false,
      }}
      pageSectionProps={{
        paddingSize: 'none',
        css: css`
          padding: 0 ${euiTheme.size.l} ${euiTheme.size.l} ${euiTheme.size.l};
        `,
      }}
      data-test-subj="alertDetails"
    >
      <HeaderMenu />
      <EuiTabbedContent data-test-subj="alertDetailsTabbedContent" tabs={tabs} />
    </ObservabilityPageTemplate>
  );
}

export function getScreenDescription(alertDetail: AlertData) {
  const alertState = alertDetail.formatted.active ? 'active' : 'recovered';
  const alertStarted = new Date(alertDetail.formatted.start).toISOString();
  const alertUpdated = new Date(alertDetail.formatted.lastUpdated).toISOString();

  return dedent(`The user is looking at an ${alertState} alert. It started at ${alertStarted}, and was last updated at ${alertUpdated}.

  ${
    alertDetail.formatted.reason
      ? `The reason given for the alert is ${alertDetail.formatted.reason}.`
      : ''
  }

  The alert details are:
  ${Object.entries(alertDetail.formatted.fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')}  

  Do not repeat this information to the user, unless it is relevant for them to know. 
  Please suggestion root causes if possilbe.
  Suggest next steps for the user to take.

  `);
}
