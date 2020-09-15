/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
import { Location } from 'history';
import { first } from 'lodash';
import React from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ErrorGroupAPIResponse } from '../../../../../server/lib/errors/get_error_group';
import { APMError } from '../../../../../typings/es_schemas/ui/apm_error';
import { IUrlParams } from '../../../../context/UrlParamsContext/types';
import { px, unit, units } from '../../../../style/variables';
import { TransactionDetailLink } from '../../../shared/Links/apm/TransactionDetailLink';
import { DiscoverErrorLink } from '../../../shared/Links/DiscoverLinks/DiscoverErrorLink';
import { fromQuery, toQuery } from '../../../shared/Links/url_helpers';
import { ErrorMetadata } from '../../../shared/MetadataTable/ErrorMetadata';
import { Stacktrace } from '../../../shared/Stacktrace';
import { Summary } from '../../../shared/Summary';
import { HttpInfoSummaryItem } from '../../../shared/Summary/HttpInfoSummaryItem';
import { UserAgentSummaryItem } from '../../../shared/Summary/UserAgentSummaryItem';
import { TimestampTooltip } from '../../../shared/TimestampTooltip';
import {
  ErrorTab,
  exceptionStacktraceTab,
  getTabs,
  logStacktraceTab,
} from './ErrorTabs';
import { ExceptionStacktrace } from './ExceptionStacktrace';

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${px(unit)};
`;

const TransactionLinkName = styled.div`
  margin-left: ${px(units.half)};
  display: inline-block;
  vertical-align: middle;
`;

interface Props {
  errorGroup: ErrorGroupAPIResponse;
  urlParams: IUrlParams;
  location: Location;
}

// TODO: Move query-string-based tabs into a re-usable component?
function getCurrentTab(
  tabs: ErrorTab[] = [],
  currentTabKey: string | undefined
): ErrorTab | {} {
  const selectedTab = tabs.find(({ key }) => key === currentTabKey);
  return selectedTab ? selectedTab : first(tabs) || {};
}

export function DetailView({ errorGroup, urlParams, location }: Props) {
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
    <EuiPanel>
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
        <DiscoverErrorLink error={error} kuery={urlParams.kuery}>
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
                  ...location,
                  search: fromQuery({
                    ...toQuery(location.search),
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
