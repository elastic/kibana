/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import {
  asMillisecondDuration,
  asPercent,
} from '../../../../../common/utils/formatters';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useBreakpoints } from '../../../../hooks/use_breakpoints';
import { useFetcher, FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../hooks/use_time_range';

interface Props {
  serverlessId?: string;
}

const CentralizedContainer = styled.div`
  display: flex;
  align-items: center;
`;

const Border = styled.div`
  height: 55px;
  border-right: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
`;

function VerticalRule() {
  return (
    <CentralizedContainer>
      <Border />
    </CentralizedContainer>
  );
}

export function ServerlessSummary({ serverlessId }: Props) {
  const breakpoints = useBreakpoints();
  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/metrics');
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const { serviceName } = useApmServiceContext();

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (!start || !end) {
        return undefined;
      }
      return callApmApi(
        'GET /internal/apm/services/{serviceName}/metrics/serverless/summary',
        {
          params: {
            path: {
              serviceName,
            },
            query: {
              kuery,
              environment,
              start,
              end,
              serverlessId,
            },
          },
        }
      );
    },
    [kuery, environment, serviceName, start, end, serverlessId]
  );

  const showVerticalRule = !breakpoints.isSmall;
  const isLoading = status === FETCH_STATUS.LOADING;

  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.apm.serverlessMetrics.summary.title', {
                defaultMessage: 'Summary',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink
            data-test-subj="apmServerlessSummaryGiveFeedbackLink"
            href="https://ela.st/feedback-aws-lambda"
            target="_blank"
          >
            {i18n.translate('xpack.apm.serverlessMetrics.summary.feedback', {
              defaultMessage: 'Give feedback',
            })}
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem grow={false}>
          <EuiStat
            isLoading={isLoading}
            title={data?.serverlessFunctionsTotal}
            titleSize="s"
            description={i18n.translate(
              'xpack.apm.serverlessMetrics.summary.lambdaFunctions',
              {
                defaultMessage:
                  'Lambda {serverlessFunctionsTotal, plural, one {function} other {functions}}',
                values: {
                  serverlessFunctionsTotal: data?.serverlessFunctionsTotal,
                },
              }
            )}
            reverse
          />
        </EuiFlexItem>
        {showVerticalRule && <VerticalRule />}
        <EuiFlexItem grow={false}>
          <EuiStat
            isLoading={isLoading}
            title={asMillisecondDuration(data?.serverlessDurationAvg)}
            titleSize="s"
            description={i18n.translate(
              'xpack.apm.serverlessMetrics.summary.functionDurationAvg',
              { defaultMessage: 'Function duration avg.' }
            )}
            reverse
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            isLoading={isLoading}
            title={asMillisecondDuration(data?.billedDurationAvg)}
            titleSize="s"
            description={i18n.translate(
              'xpack.apm.serverlessMetrics.summary.billedDurationAvg',
              { defaultMessage: 'Billed duration avg.' }
            )}
            reverse
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiStat
            isLoading={isLoading}
            title={asPercent(data?.memoryUsageAvgRate, 1)}
            titleSize="s"
            description={i18n.translate(
              'xpack.apm.serverlessMetrics.summary.memoryUsageAvg',
              { defaultMessage: 'Memory usage avg.' }
            )}
            reverse
          />
        </EuiFlexItem>
        {showVerticalRule && <VerticalRule />}
        {data?.estimatedCost && (
          <EuiFlexItem grow={false}>
            <EuiStat
              isLoading={isLoading}
              title={`$${data.estimatedCost}`}
              titleSize="s"
              description={i18n.translate(
                'xpack.apm.serverlessMetrics.summary.estimatedCost',
                { defaultMessage: 'Estimated costs avg.' }
              )}
              reverse
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
