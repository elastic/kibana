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
  EuiButton,
  EuiButtonGroup,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import {
  AlertStatus,
  ALERT_END,
  ALERT_GROUP,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { RuleTypeParams } from '@kbn/alerting-plugin/common';
import { TimeRange } from '@kbn/es-query';
import { getPaddedAlertTimeRange } from '@kbn/observability-get-padded-alert-time-range-util';
import { DataView } from '@kbn/data-views-plugin/common';
import {
  EventAnnotationConfig,
  PointInTimeEventAnnotationConfig,
} from '@kbn/event-annotation-common';
import { useKibana } from '../../utils/kibana_react';
import { useFetchRule } from '../../hooks/use_fetch_rule';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useFetchAlertDetail } from '../../hooks/use_fetch_alert_detail';
import { CenterJustifiedSpinner } from '../../components/center_justified_spinner';
import { paths } from '../../../common/locators/paths';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';
import { PageTitle, pageTitleContent } from './page_title';
import { RuleConditionChart as CollapsedCharts } from './collapsed_charts';
import { RuleConditionChart as ExpandedCharts } from './explanded_charts';
import { AlertParams } from '../../components/custom_threshold/types';
import { getGroupFilters } from '../..';
import { Group } from '../../../common/typings';
import { generateChartTitleAndTooltip } from '../../components/custom_threshold/components/alert_details_app_section/helpers/generate_chart_title_and_tooltip';

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
  const groups = alertDetail?.formatted.fields[ALERT_GROUP];

  const [chartLabel, setChartLabel] = useState<Array<{ title: string; tooltip: string }>>([]);

  const [dataView, setDataView] = useState<DataView>();
  const [, setDataViewError] = useState<Error>();

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
    if (rule?.params) {
      const chartTitleAndTooltip: Array<{ title: string; tooltip: string }> = [];
      (rule?.params.criteria as any).forEach((criterion: any) => {
        chartTitleAndTooltip.push(generateChartTitleAndTooltip(criterion));
      });
      setChartLabel(chartTitleAndTooltip);
    }
  }, [rule]);

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

  const basicButtonGroupPrefix = useGeneratedHtmlId({
    prefix: 'basicButtonGroup',
  });

  const toggleButtons = [
    {
      id: `${basicButtonGroupPrefix}__0`,
      label: 'Normalized',
    },
    {
      id: `${basicButtonGroupPrefix}__1`,
      label: 'Original',
    },
  ];

  const [toggleIdSelected, setToggleIdSelected] = useState(`${basicButtonGroupPrefix}__0`);

  const onChange = (optionId: React.SetStateAction<string>) => {
    setToggleIdSelected(optionId);
  };

  const [toggle0On, setToggle0On] = useState(false);
  const [intervalValue, setIntervalValue] = useState('');
  const [chartInterval, setChartInterval] = useState('');

  const onIntervalChange = (e: any) => {
    setIntervalValue(e.target.value);
  };

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
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="o11yInvestigationDetailsLink"
            onClick={() => {
              setToggle0On((isOn) => !isOn);
            }}
          >
            {toggle0On ? 'Hide separate charts' : 'Show separate charts'}
          </EuiButton>
        </EuiFlexItem>
        {
          <EuiFlexItem>
            <EuiButtonGroup
              legend="normalizedOriginalGroup"
              options={toggleButtons}
              idSelected={toggleIdSelected}
              onChange={(id) => onChange(id)}
              color="primary"
              buttonSize="m"
              isFullWidth
              style={{ width: 250 }}
            />
          </EuiFlexItem>
        }
        {
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiFieldText
                  data-test-subj="o11yInvestigationDetailsFieldText"
                  placeholder="Histogram interval"
                  value={intervalValue}
                  onChange={onIntervalChange}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="o11yInvestigationDetailsApplyButton"
                  onClick={() => {
                    setChartInterval(intervalValue);
                  }}
                >
                  {i18n.translate('xpack.observability.investigationDetails.applyButtonLabel', {
                    defaultMessage: 'Apply',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        }
      </EuiFlexGroup>
      {rule?.params ? (
        <CollapsedCharts
          additionalFilters={getGroupFilters(groups as Group[])}
          annotations={annotations}
          chartOptions={{
            seriesType: 'line',
            interval: chartInterval,
          }}
          dataView={dataView}
          groupBy={rule?.params.groupBy as string[]}
          metricExpression={(rule?.params as RuleTypeParams & AlertParams).criteria}
          searchConfiguration={rule?.params.searchConfiguration || ''}
          timeRange={timeRange}
          mode={toggleIdSelected === `${basicButtonGroupPrefix}__1` ? 'original' : 'normalized'}
        />
      ) : (
        <></>
      )}

      {rule?.params && toggle0On ? (
        <EuiFlexGroup direction="column" data-test-subj="thresholdAlertOverviewSection">
          {(rule?.params.criteria as any).map((criterion: any, index: number) => (
            <EuiFlexItem key={`criterion-${index}`}>
              {/* <EuiPanel hasBorder hasShadow={false}> */}
              <EuiToolTip content={chartLabel[index].tooltip}>
                <EuiTitle size="xs">
                  <h4 data-test-subj={`chartTitle-${index}`}>{chartLabel[index].title}</h4>
                </EuiTitle>
              </EuiToolTip>
              <EuiSpacer size="m" />
              <EuiFlexGroup>
                <EuiFlexItem grow={5}>
                  <ExpandedCharts
                    additionalFilters={getGroupFilters(groups as Group[])}
                    annotations={annotations}
                    chartOptions={{
                      // For alert details page, the series type needs to be changed to 'bar_stacked'
                      // due to https://github.com/elastic/elastic-charts/issues/2323
                      seriesType: 'bar_stacked',
                      interval: chartInterval,
                    }}
                    dataView={dataView}
                    groupBy={rule?.params.groupBy as string[]}
                    metricExpression={criterion}
                    searchConfiguration={rule?.params.searchConfiguration || ''}
                    timeRange={timeRange}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
              {/* </EuiPanel> */}
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ) : (
        <></>
      )}
    </ObservabilityPageTemplate>
  );
}
