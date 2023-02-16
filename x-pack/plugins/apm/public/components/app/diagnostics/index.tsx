/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiAvatar,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
  EuiTimeline,
  EuiTimelineItem,
  EuiTitle,
  useGeneratedHtmlId,
  EuiCodeBlock,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import { useTimeRange } from '../../../hooks/use_time_range';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { DownloadJson } from './download_json';
import { LoadingTimelineItem } from './loading_timeline_item';

export function Diagnostics() {
  const [configData, setConfigData] = useState<'success' | 'error'>();
  const [actionsEnabled, setActionsEnabled] = useState(false);
  const [reportData, setReportData] = useState<Record<string, any>>();

  const { start, end } = useTimeRange({
    rangeFrom: 'now-1d',
    rangeTo: 'now',
  });

  const buttonElementAccordionId = useGeneratedHtmlId({
    prefix: 'buttonElementAccordion',
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

  const restartDiagnostic = () => {
    console.log('restarting Diagnostic');
  };

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
    setReportData((prev) => ({
      ...prev,
      apmData,
    }));
  }, [apmData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setConfigData('success');
      setReportData((prev) => ({
        ...prev,
        apmConfiguration: {
          pipelines: setupConfigData?.pipelines,
          templates: setupConfigData?.templates,
        },
      }));
    }, 1000);
    return () => clearTimeout(timer);
  }, [setupConfigData]);
  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            color="primary"
            isDisabled={!actionsEnabled}
            onClick={restartDiagnostic}
          >
            {i18n.translate('xpack.apm.diagnostics.restartDiagnostic', {
              defaultMessage: 'Restart diagnostic',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
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
            ) : apmData ? (
              <EuiAvatar name="Checked" iconType="check" color="#6dccb1" />
            ) : (
              <EuiAvatar name="Checked" iconType="alert" color="#ff7f62" />
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
              <EuiTitle size="s">
                <h2>
                  {i18n.translate('xpack.apm.diagnostics.apmData.title', {
                    defaultMessage: 'APM Data',
                  })}
                </h2>
              </EuiTitle>
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

              {FETCH_STATUS.SUCCESS && (
                <>
                  <EuiSpacer />
                  <EuiAccordion
                    id={buttonElementAccordionId}
                    buttonElement="div"
                    buttonContent="Advanced settings"
                  >
                    <EuiPanel color="transparent">
                      Any content inside of <strong>EuiAccordion</strong> will
                      appear here.
                    </EuiPanel>
                  </EuiAccordion>
                </>
              )}
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
        </EuiTimelineItem>
      </EuiTimeline>
    </>
  );
}
