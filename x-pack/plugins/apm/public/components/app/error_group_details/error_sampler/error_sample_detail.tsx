/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
  EuiToolTip,
  EuiEmptyPrompt,
  EuiPagination,
  EuiLoadingContent,
  EuiBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { first } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { TransactionDetailLink } from '../../../shared/links/apm/transaction_detail_link';
import { DiscoverErrorLink } from '../../../shared/links/discover_links/discover_error_link';
import { fromQuery, toQuery } from '../../../shared/links/url_helpers';
import { ErrorMetadata } from '../../../shared/metadata_table/error_metadata';
import { Stacktrace } from '../../../shared/stacktrace';
import { Summary } from '../../../shared/summary';
import { HttpInfoSummaryItem } from '../../../shared/summary/http_info_summary_item';
import { UserAgentSummaryItem } from '../../../shared/summary/user_agent_summary_item';
import { TimestampTooltip } from '../../../shared/timestamp_tooltip';
import {
  ErrorTab,
  exceptionStacktraceTab,
  getTabs,
  logStacktraceTab,
} from './error_tabs';
import { ExceptionStacktrace } from './exception_stacktrace';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { ERROR_GROUP_ID } from '../../../../../common/es_fields/apm';
import { TraceSearchType } from '../../../../../common/trace_explorer';
import { TransactionTab } from '../../transaction_details/waterfall_with_summary/transaction_tabs';
import { useTraceExplorerEnabledSetting } from '../../../../hooks/use_trace_explorer_enabled_setting';
import { FETCH_STATUS, isPending } from '../../../../hooks/use_fetcher';
import { APMError } from '../../../../../typings/es_schemas/ui/apm_error';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { SampleSummary } from './sample_summary';

const TransactionLinkName = euiStyled.div`
  margin-left: ${({ theme }) => theme.eui.euiSizeS};
  display: inline-block;
  vertical-align: middle;
`;

interface Props {
  onSampleClick: (sample: string) => void;
  errorSampleIds: string[];
  errorSamplesFetchStatus: FETCH_STATUS;
  errorData: APIReturnType<'GET /internal/apm/services/{serviceName}/errors/{groupId}/error/{errorId}'>;
  errorFetchStatus: FETCH_STATUS;
  occurrencesCount: number;
}

function getCurrentTab(
  tabs: ErrorTab[] = [],
  currentTabKey: string | undefined
): ErrorTab | {} {
  const selectedTab = tabs.find(({ key }) => key === currentTabKey);
  return selectedTab ?? (first(tabs) || {});
}

export function ErrorSampleDetails({
  onSampleClick,
  errorSampleIds,
  errorSamplesFetchStatus,
  errorData,
  errorFetchStatus,
  occurrencesCount,
}: Props) {
  const [sampleActivePage, setSampleActivePage] = useState(0);
  const history = useHistory();
  const {
    urlParams: { detailTab, offset, comparisonEnabled },
  } = useLegacyUrlParams();

  const router = useApmRouter();

  const isTraceExplorerEnabled = useTraceExplorerEnabledSetting();

  const {
    path: { groupId },
    query,
  } = useApmParams('/services/{serviceName}/errors/{groupId}');

  const { kuery } = query;

  const loadingErrorSamplesData = isPending(errorSamplesFetchStatus);
  const loadingErrorData = isPending(errorFetchStatus);
  const isLoading = loadingErrorSamplesData || loadingErrorData;

  const isSucceded =
    errorSamplesFetchStatus === FETCH_STATUS.SUCCESS &&
    errorFetchStatus === FETCH_STATUS.SUCCESS;

  useEffect(() => {
    setSampleActivePage(0);
  }, [errorSampleIds]);

  const goToSample = (index: number) => {
    const sample = errorSampleIds[index];
    setSampleActivePage(index);
    onSampleClick(sample);
  };

  const { error, transaction } = errorData;

  if (!error && errorSampleIds?.length === 0 && isSucceded) {
    return (
      <EuiEmptyPrompt
        title={
          <div>
            {i18n.translate('xpack.apm.errorSampleDetails.sampleNotFound', {
              defaultMessage: 'The selected error cannot be found',
            })}
          </div>
        }
        titleSize="s"
      />
    );
  }

  const tabs = getTabs(error);
  const currentTab = getCurrentTab(tabs, detailTab) as ErrorTab;

  const errorUrl = error.error.page?.url || error.url?.full;
  const method = error.http?.request?.method;
  const status = error.http?.response?.status_code;
  const environment = error.service.environment;
  const serviceVersion = error.service.version;
  const isUnhandled = error.error.exception?.[0].handled === false;

  const traceExplorerLink = router.link('/traces/explorer/waterfall', {
    query: {
      ...query,
      showCriticalPath: false,
      query: `${ERROR_GROUP_ID}:${groupId}`,
      type: TraceSearchType.kql,
      traceId: '',
      transactionId: '',
      waterfallItemId: '',
      detailTab: TransactionTab.timeline,
    },
  });

  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h3>
              {i18n.translate(
                'xpack.apm.errorSampleDetails.errorOccurrenceTitle',
                {
                  defaultMessage: 'Error sample',
                }
              )}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow>
          {!!errorSampleIds?.length && (
            <EuiPagination
              pageCount={errorSampleIds.length}
              activePage={sampleActivePage}
              onPageClick={goToSample}
              compressed
            />
          )}
        </EuiFlexItem>
        {isTraceExplorerEnabled && (
          <EuiFlexItem grow={false}>
            <EuiLink href={traceExplorerLink}>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem>
                  <EuiIcon type="apmTrace" />
                </EuiFlexItem>
                <EuiFlexItem style={{ whiteSpace: 'nowrap' }}>
                  {i18n.translate(
                    'xpack.apm.errorSampleDetails.viewOccurrencesInTraceExplorer',
                    {
                      defaultMessage: 'Explore traces with this error',
                    }
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiLink>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <DiscoverErrorLink error={error} kuery={kuery}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem>
                <EuiIcon type="discoverApp" />
              </EuiFlexItem>
              <EuiFlexItem style={{ whiteSpace: 'nowrap' }}>
                {i18n.translate(
                  'xpack.apm.errorSampleDetails.viewOccurrencesInDiscoverButtonLabel',
                  {
                    defaultMessage:
                      'View {occurrencesCount} {occurrencesCount, plural, one {occurrence} other {occurrences}} in Discover',
                    values: { occurrencesCount },
                  }
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </DiscoverErrorLink>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      {isLoading ? (
        <EuiFlexItem grow={false}>
          <EuiSpacer size="s" />
          <EuiLoadingContent lines={2} data-test-sub="loading-content" />
        </EuiFlexItem>
      ) : (
        <Summary
          items={[
            <TimestampTooltip
              time={errorData ? error.timestamp.us / 1000 : 0}
            />,
            errorUrl && method ? (
              <HttpInfoSummaryItem
                url={errorUrl}
                method={method}
                status={status}
              />
            ) : null,
            transaction && transaction.user_agent ? (
              <UserAgentSummaryItem {...transaction.user_agent} />
            ) : null,
            transaction && (
              <EuiToolTip
                content={i18n.translate(
                  'xpack.apm.errorSampleDetails.relatedTransactionSample',
                  {
                    defaultMessage: 'Related transaction sample',
                  }
                )}
              >
                <TransactionDetailLink
                  traceId={transaction.trace.id}
                  transactionId={transaction.transaction.id}
                  transactionName={transaction.transaction.name}
                  transactionType={transaction.transaction.type}
                  serviceName={transaction.service.name}
                  offset={offset}
                  comparisonEnabled={comparisonEnabled}
                >
                  <EuiIcon type="merge" />
                  <TransactionLinkName>
                    {transaction.transaction.name}
                  </TransactionLinkName>
                </TransactionDetailLink>
              </EuiToolTip>
            ),
            environment ? (
              <EuiToolTip
                content={i18n.translate(
                  'xpack.apm.errorSampleDetails.serviceEnvironment',
                  {
                    defaultMessage: 'Environment',
                  }
                )}
              >
                <EuiBadge color="hollow">{environment}</EuiBadge>
              </EuiToolTip>
            ) : null,
            serviceVersion ? (
              <EuiToolTip
                content={i18n.translate(
                  'xpack.apm.errorSampleDetails.serviceVersion',
                  {
                    defaultMessage: 'Service version',
                  }
                )}
              >
                <EuiBadge color="hollow">{serviceVersion}</EuiBadge>
              </EuiToolTip>
            ) : null,
            isUnhandled ? (
              <EuiBadge color="warning">
                {i18n.translate('xpack.apm.errorGroupDetails.unhandledLabel', {
                  defaultMessage: 'Unhandled',
                })}
              </EuiBadge>
            ) : null,
          ]}
        />
      )}

      <EuiSpacer />
      {isLoading ? (
        <EuiFlexItem grow={false}>
          <EuiSpacer size="s" />
          <EuiLoadingContent lines={3} data-test-sub="loading-content" />
        </EuiFlexItem>
      ) : (
        <SampleSummary error={error} />
      )}

      <EuiTabs>
        {tabs.map(({ key, label }) => {
          return (
            <EuiTab
              onClick={() => {
                history.replace({
                  ...history.location,
                  search: fromQuery({
                    ...toQuery(history.location.search),
                    detailTab: key,
                  }),
                });
              }}
              isSelected={currentTab.key === key}
              key={key}
            >
              {label}
            </EuiTab>
          );
        })}
      </EuiTabs>
      <EuiSpacer />
      {isLoading || !error ? (
        <EuiLoadingContent lines={3} data-test-sub="loading-content" />
      ) : (
        <TabContent error={error} currentTab={currentTab} />
      )}
    </EuiPanel>
  );
}

function TabContent({
  error,
  currentTab,
}: {
  error: APMError;
  currentTab: ErrorTab;
}) {
  const codeLanguage = error?.service.language?.name;
  const exceptions = error?.error.exception || [];
  const logStackframes = error?.error.log?.stacktrace;

  switch (currentTab.key) {
    case logStacktraceTab.key:
      return (
        <Stacktrace stackframes={logStackframes} codeLanguage={codeLanguage} />
      );
    case exceptionStacktraceTab.key:
      return (
        <ExceptionStacktrace
          codeLanguage={codeLanguage}
          exceptions={exceptions}
        />
      );
    default:
      return <ErrorMetadata error={error} />;
  }
}
