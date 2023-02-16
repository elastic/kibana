/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import {
  EuiAvatar,
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTimeline,
  EuiTimelineItem,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { useApmParams } from '../../../hooks/use_apm_params';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { ApmDatePicker } from '../../shared/date_picker/apm_date_picker';
import { DownloadJson } from './download_json';
import { LoadingTimelineItem } from './loading_timeline_item';
import { ApmDataServiceItem, DiagnosticsServicesList } from './services_list';

export function Diagnostics() {
  const [actionsEnabled, setActionsEnabled] = useState(false);
  const [reportData, setReportData] = useState<Record<string, any>>();
  const [suspiciousServices, setSuspiciousServices] =
    useState<ApmDataServiceItem[]>();

  const {
    query: { rangeFrom, rangeTo },
  } = useApmParams('/diagnostics');

  const { start, end } = useTimeRange({
    rangeFrom,
    rangeTo,
  });

  const { data: setupConfigData, status: setupConfigStatus } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/diagnostics/setup_config');
    },
    []
  );

  const { data: apmData, status: apmDataStatus } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/diagnostics/services_summary', {
        params: {
          query: {
            start,
            end,
            probability: 1,
          },
        },
      });
    },
    [start, end]
  );

  const downloadReport = async () => {
    DownloadJson(
      `apm-diagnostic-${moment(Date.now()).format('YYYYMMDDHHmmss')}.json`,
      reportData
    );
  };

  useEffect(() => {
    if (setupConfigData && apmData) {
      setActionsEnabled(true);
    }
  }, [setupConfigData, apmData]);

  useEffect(() => {
    setSuspiciousServices(
      apmData?.services.filter(
        (service) => !(service.transactions && service.metrics && service.spans)
      )
    );

    setReportData((prev) => ({
      ...prev,
      apmData,
    }));
  }, [apmData]);

  useEffect(() => {
    setReportData((prev) => ({
      ...prev,
      apmConfiguration: {
        pipelines: setupConfigData?.pipelines,
        templates: setupConfigData?.templates,
      },
    }));
  }, [setupConfigData]);
  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="download"
            isDisabled={!actionsEnabled}
            onClick={downloadReport}
            fill
          >
            {i18n.translate('xpack.apm.diagnostics.downloadReport', {
              defaultMessage: 'Download report',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiTimeline aria-label="Life cycle of data">
        <EuiTimelineItem
          verticalAlign="top"
          icon={
            setupConfigStatus === FETCH_STATUS.NOT_INITIATED ? (
              <EuiAvatar name="Checked" iconType="dot" color="subdued" />
            ) : setupConfigStatus === FETCH_STATUS.LOADING ? (
              <LoadingTimelineItem />
            ) : setupConfigData ? (
              <EuiAvatar name="Checked" iconType="check" color="#6dccb1" />
            ) : (
              <EuiAvatar name="Checked" iconType="alert" color="#ff7f62" />
            )
          }
        >
          <EuiSplitPanel.Outer color="transparent" hasBorder grow>
            <EuiSplitPanel.Inner>
              <EuiTitle size="s">
                <h2>
                  {i18n.translate(
                    'xpack.apm.diagnostics.apmConfiguration.title',
                    {
                      defaultMessage: 'APM Configuration',
                    }
                  )}
                </h2>
              </EuiTitle>
            </EuiSplitPanel.Inner>
            <EuiHorizontalRule margin="none" />
            <EuiSplitPanel.Inner>
              <EuiText size="s">
                <p>
                  {i18n.translate(
                    'xpack.apm.diagnostics.apmConfiguration.description',
                    {
                      defaultMessage:
                        "Checks indexes, pipelines and components to see if everything APM needs to operate it's correctly set up.",
                    }
                  )}
                </p>
                {setupConfigData?.pipelines && (
                  <EuiCodeBlock language="json" overflowHeight={300}>
                    {JSON.stringify(setupConfigData?.pipelines)}
                  </EuiCodeBlock>
                )}
              </EuiText>
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
        </EuiTimelineItem>
        <EuiTimelineItem
          verticalAlign="top"
          icon={
            apmDataStatus === FETCH_STATUS.NOT_INITIATED ? (
              <EuiAvatar name="Checked" iconType="dot" color="subdued" />
            ) : apmDataStatus === FETCH_STATUS.LOADING ? (
              <LoadingTimelineItem />
            ) : apmData?.services && apmData?.services.length > 0 ? (
              suspiciousServices ? (
                <EuiAvatar name="Checked" iconType="alert" color="#f1d86f" />
              ) : (
                <EuiAvatar name="Checked" iconType="check" color="#6dccb1" />
              )
            ) : (
              <EuiAvatar name="Checked" iconType="error" color="#ff7f62" />
            )
          }
        >
          <EuiSplitPanel.Outer color="transparent" hasBorder grow>
            <EuiSplitPanel.Inner
              color={
                apmDataStatus !== FETCH_STATUS.NOT_INITIATED
                  ? 'transparent'
                  : 'subdued'
              }
            >
              <EuiFlexGroup justifyContent="flexEnd">
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h2>
                      {i18n.translate('xpack.apm.diagnostics.apmData.title', {
                        defaultMessage: 'APM Data',
                      })}
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <ApmDatePicker />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiSplitPanel.Inner>
            <EuiHorizontalRule margin="none" />
            <EuiSplitPanel.Inner>
              <EuiText size="s" grow={false}>
                <p>
                  {i18n.translate('xpack.apm.diagnostics.apmData.description', {
                    defaultMessage: 'Checks APM data is in place.',
                  })}
                </p>
              </EuiText>
              {FETCH_STATUS.SUCCESS &&
                apmData &&
                apmData?.services &&
                apmData?.services.length === 0 && (
                  <EuiEmptyPrompt
                    iconType="alert"
                    color="danger"
                    title={
                      <h2>
                        {i18n.translate(
                          'xpack.apm.diagnostics.apmData.noData',
                          {
                            defaultMessage: 'No data',
                          }
                        )}
                      </h2>
                    }
                    body={
                      <p>
                        {i18n.translate(
                          'xpack.apm.diagnostics.apmData.noData.message',
                          {
                            defaultMessage:
                              'No APM data have been found. Please check our troubleshooting page',
                          }
                        )}
                      </p>
                    }
                  />
                )}
              {FETCH_STATUS.SUCCESS &&
                suspiciousServices &&
                suspiciousServices?.length > 0 && (
                  <>
                    <EuiSpacer />
                    <DiagnosticsServicesList items={suspiciousServices} />
                  </>
                )}
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
        </EuiTimelineItem>
      </EuiTimeline>
    </>
  );
}
