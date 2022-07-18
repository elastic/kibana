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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { first } from 'lodash';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import type { APMError } from '../../../../../typings/es_schemas/ui/apm_error';
import type { ApmUrlParams } from '../../../../context/url_params_context/types';
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
import { ERROR_GROUP_ID } from '../../../../../common/elasticsearch_fieldnames';
import { TraceSearchType } from '../../../../../common/trace_explorer';
import { TransactionTab } from '../../transaction_details/waterfall_with_summary/transaction_tabs';
import { useTraceExplorerEnabledSetting } from '../../../../hooks/use_trace_explorer_enabled_setting';

const TransactionLinkName = euiStyled.div`
  margin-left: ${({ theme }) => theme.eui.euiSizeS};
  display: inline-block;
  vertical-align: middle;
`;

interface Props {
  errorGroup: APIReturnType<'GET /internal/apm/services/{serviceName}/errors/{groupId}'>;
  urlParams: ApmUrlParams;
  kuery: string;
}

// TODO: Move query-string-based tabs into a re-usable component?
function getCurrentTab(
  tabs: ErrorTab[] = [],
  currentTabKey: string | undefined
): ErrorTab | {} {
  const selectedTab = tabs.find(({ key }) => key === currentTabKey);
  return selectedTab ? selectedTab : first(tabs) || {};
}

export function DetailView({ errorGroup, urlParams, kuery }: Props) {
  const history = useHistory();
  const { transaction, error, occurrencesCount } = errorGroup;

  const { detailTab, offset, comparisonEnabled } = urlParams;

  const router = useApmRouter();

  const isTraceExplorerEnabled = useTraceExplorerEnabledSetting();

  const {
    path: { groupId },
    query,
  } = useApmParams('/services/{serviceName}/errors/{groupId}');

  if (!error) {
    return null;
  }

  const tabs = getTabs(error);
  const currentTab = getCurrentTab(tabs, detailTab) as ErrorTab;

  const errorUrl = error.error.page?.url || error.url?.full;

  const method = error.http?.request?.method;
  const status = error.http?.response?.status_code;

  const traceExplorerLink = router.link('/traces/explorer', {
    query: {
      ...query,
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
        <EuiFlexItem grow>
          <EuiTitle size="s">
            <h3>
              {i18n.translate(
                'xpack.apm.errorGroupDetails.errorOccurrenceTitle',
                {
                  defaultMessage: 'Error occurrence',
                }
              )}
            </h3>
          </EuiTitle>
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
                    'xpack.apm.errorGroupDetails.viewOccurrencesInTraceExplorer',
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
                  'xpack.apm.errorGroupDetails.viewOccurrencesInDiscoverButtonLabel',
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

      <Summary
        items={[
          <TimestampTooltip time={error.timestamp.us / 1000} />,
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
                'xpack.apm.errorGroupDetails.relatedTransactionSample',
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
        ]}
      />

      <EuiSpacer />

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
      <TabContent error={error} currentTab={currentTab} />
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
  const codeLanguage = error.service.language?.name;
  const exceptions = error.error.exception || [];
  const logStackframes = error.error.log?.stacktrace;

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
