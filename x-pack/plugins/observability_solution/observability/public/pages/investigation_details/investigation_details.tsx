/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useParams } from 'react-router-dom';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import {
  AlertStatus,
  ALERT_END,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { getPaddedAlertTimeRange } from '@kbn/observability-get-padded-alert-time-range-util';
import { DataView } from '@kbn/data-views-plugin/common';
import {
  EventAnnotationConfig,
  PointInTimeEventAnnotationConfig,
} from '@kbn/event-annotation-common';
import moment from 'moment';
import { useKibana } from '../../utils/kibana_react';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useFetchAlertDetail } from '../../hooks/use_fetch_alert_detail';
import { CenterJustifiedSpinner } from '../../components/center_justified_spinner';
import { paths } from '../../../common/locators/paths';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';
import { PageTitle, pageTitleContent } from './page_title';
import { getRecentEvents } from './get_recent_events';

interface AlertDetailsPathParams {
  alertId: string;
}

interface DetectedEvent {
  timestamp: Date;
  message: string;
  deviation: number;
  unit: string;
}

export const ALERT_DETAILS_PAGE_ID = 'alert-details-o11y';
const defaultBreadcrumb = i18n.translate('xpack.observability.breadcrumbs.alertDetails', {
  defaultMessage: 'Alert details',
});

export const LOG_DOCUMENT_COUNT_RULE_TYPE_ID = 'logs.alert.document.count';
export const METRIC_THRESHOLD_ALERT_TYPE_ID = 'metrics.alert.threshold';
export const METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID = 'metrics.alert.inventory.threshold';

export function InvestigationDetails() {
  const {
    http,
    triggersActionsUi: { ruleTypeRegistry },
    data,
  } = useKibana().services;

  const { euiTheme } = useEuiTheme();

  const { ObservabilityPageTemplate } = usePluginContext();
  const { alertId } = useParams<AlertDetailsPathParams>();
  const [isLoading, alertDetail] = useFetchAlertDetail(alertId);
  const ruleId = alertDetail?.formatted.fields[ALERT_RULE_UUID];
  const { rule, isLoading: isRuleLoading } = useFetchRule({
    ruleId,
  });
  const [alertStatus, setAlertStatus] = useState<AlertStatus>();
  const [timeRange, setTimeRange] = useState<TimeRange>({ from: 'now-15m', to: 'now' });
  const alertStart = alertDetail?.formatted.fields[ALERT_START];
  const alertEnd = alertDetail?.formatted.fields[ALERT_END];

  const [dataView, setDataView] = useState<DataView>();
  const [, setDataViewError] = useState<Error>();

  const [intervalValue, setIntervalValue] = useState('');
  const [eventsInterval, setEventsInterval] = useState('1h');
  const [recentEvents, setRecentEvents] = useState([]);

  const onIntervalChange = (e: any) => {
    setIntervalValue(e.target.value);
  };

  const onIntervalApply = () => {
    setEventsInterval(intervalValue !== '' ? intervalValue : '1h');
  };

  const fetchRecentEvents = useCallback(async () => {
    const { recentEvents: events } = await getRecentEvents(http, { eventsInterval });
    setRecentEvents(events);
  }, [http, eventsInterval]);

  useEffect(() => {
    fetchRecentEvents();
  }, [fetchRecentEvents]);

  const alertStartAnnotation: PointInTimeEventAnnotationConfig = {
    label: 'Alert',
    type: 'manual',
    key: {
      type: 'point_in_time',
      timestamp: alertStart!,
    },
    color: euiTheme.colors.danger,
    icon: 'alert',
    id: 'custom_threshold_alert_start_annotation',
    lineWidth: 2,
  };

  const annotations: EventAnnotationConfig[] = [];
  annotations.push(alertStartAnnotation);

  useBreadcrumbs([
    {
      href: http.basePath.prepend(
        paths.observability.investigationDetails(alertDetail?.formatted?.fields[ALERT_UUID] || '')
      ) as any,
      text: i18n.translate('xpack.observability.breadcrumbs.alertInvestigationLinkText', {
        defaultMessage: 'Investigation',
      }),
      deepLinkId: 'observability-overview:alerts',
    },
    {
      text: alertDetail
        ? pageTitleContent(alertDetail.formatted.fields[ALERT_RULE_CATEGORY])
        : defaultBreadcrumb,
    },
  ]);

  useEffect(() => {
    const initDataView = async () => {
      const ruleSearchConfiguration = rule?.params.searchConfiguration;
      try {
        if (ruleSearchConfiguration) {
          const createdSearchSource = await data.search.searchSource.create(
            ruleSearchConfiguration
          );
          setDataView(createdSearchSource.getField('index'));
        }
      } catch (error) {
        setDataViewError(error);
      }
    };

    initDataView();
  }, [rule, data.search.searchSource]);

  useEffect(() => {
    setTimeRange(getPaddedAlertTimeRange(alertStart!, alertEnd));
  }, [rule, alertStart, alertEnd]);

  useEffect(() => {
    if (alertDetail) {
      setAlertStatus(alertDetail?.formatted?.fields[ALERT_STATUS] as AlertStatus);
    }
  }, [rule, alertDetail, ruleTypeRegistry]);

  if (isLoading || isRuleLoading) {
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
      }}
      data-test-subj="alertInvestigationDetails"
    >
      <HeaderMenu />
      <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiFieldText
            data-test-subj="o11yInvestigationDetailsFieldText"
            placeholder={`Events interval (1h)`}
            value={intervalValue}
            onChange={onIntervalChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton data-test-subj="o11yInvestigationDetailsApplyButton" onClick={onIntervalApply}>
            {i18n.translate('xpack.observability.investigationDetails.applyButtonLabel', {
              defaultMessage: 'Apply',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem>
          <EuiPanel>
            <EuiText size="m" css={{ fontWeight: 600 }}>
              {i18n.translate('xpack.observability.investigationDetails.recentEventsTextLabel', {
                defaultMessage: 'Recent events',
              })}
            </EuiText>
            <EuiSpacer size="m" />
            {!recentEvents ||
              (recentEvents.length === 0 && (
                <EuiText>
                  {i18n.translate(
                    'xpack.observability.investigationDetails.noEventsFoundTextLabel',
                    { defaultMessage: 'No events found' }
                  )}
                </EuiText>
              ))}
            {recentEvents.map((e: DetectedEvent, index: number) => {
              return (
                <div key={`event-${index}`}>
                  <EuiFlexGroup>
                    <EuiFlexItem grow={false} style={{ minWidth: 175 }}>
                      <EuiText size="s">
                        {moment(e.timestamp).format('MMM D, YYYY @ HH:mm:ss')}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText size="s">{e.message}</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiFlexGroup justifyContent="flexEnd">
                        <EuiText
                          size="s"
                          style={{ color: `${e.message.includes('increase') ? 'red' : 'green'}` }}
                        >
                          {e.message.includes('increase') ? '+' : '-'}
                          {e.deviation}
                          {e.unit}
                        </EuiText>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  {index !== recentEvents.length - 1 && <EuiHorizontalRule margin="s" />}
                </div>
              );
            })}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}
