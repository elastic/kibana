/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiIcon,
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
import { euiStyled } from '../../../../../../../../src/plugins/kibana_react/common';
import type { APIReturnType } from '../../../../services/rest/createCallApmApi';
import type { APMError } from '../../../../../typings/es_schemas/ui/apm_error';
import type { ApmUrlParams } from '../../../../context/url_params_context/types';
import { TransactionDetailLink } from '../../../shared/Links/apm/transaction_detail_link';
import { DiscoverErrorLink } from '../../../shared/Links/DiscoverLinks/DiscoverErrorLink';
import { fromQuery, toQuery } from '../../../shared/Links/url_helpers';
import { ErrorMetadata } from '../../../shared/MetadataTable/ErrorMetadata';
import { Stacktrace } from '../../../shared/Stacktrace';
import { Summary } from '../../../shared/Summary';
import { HttpInfoSummaryItem } from '../../../shared/Summary/http_info_summary_item';
import { UserAgentSummaryItem } from '../../../shared/Summary/UserAgentSummaryItem';
import { TimestampTooltip } from '../../../shared/TimestampTooltip';
import {
  ErrorTab,
  exceptionStacktraceTab,
  getTabs,
  logStacktraceTab,
} from './ErrorTabs';
import { ExceptionStacktrace } from './exception_stacktrace';

const HeaderContainer = euiStyled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.eui.euiSize};
`;

const TransactionLinkName = euiStyled.div`
  margin-left: ${({ theme }) => theme.eui.euiSizeS};
  display: inline-block;
  vertical-align: middle;
`;

interface Props {
  errorGroup: APIReturnType<'GET /api/apm/services/{serviceName}/errors/{groupId}'>;
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

  if (!error) {
    return null;
  }

  const tabs = getTabs(error);
  const currentTab = getCurrentTab(tabs, urlParams.detailTab) as ErrorTab;

  const errorUrl = error.error.page?.url || error.url?.full;

  const method = error.http?.request?.method;
  const status = error.http?.response?.status_code;

  return (
    <EuiPanel hasBorder={true}>
      <HeaderContainer>
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
        <DiscoverErrorLink error={error} kuery={kuery}>
          <EuiButtonEmpty iconType="discoverApp">
            {i18n.translate(
              'xpack.apm.errorGroupDetails.viewOccurrencesInDiscoverButtonLabel',
              {
                defaultMessage:
                  'View {occurrencesCount} {occurrencesCount, plural, one {occurrence} other {occurrences}} in Discover.',
                values: { occurrencesCount },
              }
            )}
          </EuiButtonEmpty>
        </DiscoverErrorLink>
      </HeaderContainer>

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
