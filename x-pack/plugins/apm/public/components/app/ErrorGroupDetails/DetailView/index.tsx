/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import idx from 'idx';
import { first, get } from 'lodash';
import React from 'react';
import { RRRRenderResponse } from 'react-redux-request';
import styled from 'styled-components';
import {
  ERROR_EXC_STACKTRACE,
  ERROR_LOG_STACKTRACE
} from 'x-pack/plugins/apm/common/constants';
import { KibanaLink } from 'x-pack/plugins/apm/public/components/shared/Links/KibanaLink';
import { legacyEncodeURIComponent } from 'x-pack/plugins/apm/public/components/shared/Links/url_helpers';
import {
  fromQuery,
  history,
  toQuery
} from 'x-pack/plugins/apm/public/components/shared/Links/url_helpers';
import { NOT_AVAILABLE_LABEL } from 'x-pack/plugins/apm/public/constants';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { ErrorGroupAPIResponse } from 'x-pack/plugins/apm/server/lib/errors/get_error_group';
import { APMError } from 'x-pack/plugins/apm/typings/es_schemas/Error';
import { IStackframe } from 'x-pack/plugins/apm/typings/es_schemas/Stackframe';
import { Transaction } from 'x-pack/plugins/apm/typings/es_schemas/Transaction';
import {
  ERROR_EXC_HANDLED,
  REQUEST_METHOD,
  REQUEST_URL_FULL,
  TRACE_ID,
  TRANSACTION_ID,
  USER_ID
} from '../../../../../common/constants';
import { STATUS } from '../../../../constants';
import {
  borderRadius,
  colors,
  px,
  unit,
  units
} from '../../../../style/variables';
import { DiscoverErrorLink } from '../../../shared/Links/DiscoverLinks/DiscoverErrorLink';
import {
  getPropertyTabNames,
  PropertiesTable,
  Tab
} from '../../../shared/PropertiesTable';
import { Stacktrace } from '../../../shared/Stacktrace';
import { StickyProperties } from '../../../shared/StickyProperties';

const Container = styled.div`
  position: relative;
  border: 1px solid ${colors.gray4};
  border-radius: ${borderRadius};
  margin-top: ${px(units.plus)};
`;

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: ${px(units.plus)} ${px(units.plus)} 0;
  margin-bottom: ${px(unit)};
`;

const PaddedContainer = styled.div`
  padding: ${px(units.plus)} ${px(units.plus)} 0;
`;

const logStacktraceTab = {
  key: 'log_stacktrace',
  label: i18n.translate('xpack.apm.propertiesTable.tabs.logStacktraceLabel', {
    defaultMessage: 'Log stacktrace'
  })
};
const exceptionStacktraceTab = {
  key: 'exception_stacktrace',
  label: i18n.translate(
    'xpack.apm.propertiesTable.tabs.exceptionStacktraceLabel',
    {
      defaultMessage: 'Exception stacktrace'
    }
  )
};

interface Props {
  errorGroup: RRRRenderResponse<ErrorGroupAPIResponse>;
  urlParams: IUrlParams;
  location: Location;
}

export function DetailView({ errorGroup, urlParams, location }: Props) {
  if (errorGroup.status !== STATUS.SUCCESS) {
    return null;
  }
  const { transaction, error, occurrencesCount } = errorGroup.data;

  if (!error) {
    return null;
  }

  const transactionLink = getTransactionLink(error, transaction);
  const stickyProperties = [
    {
      fieldName: '@timestamp',
      label: i18n.translate('xpack.apm.errorGroupDetails.timestampLabel', {
        defaultMessage: 'Timestamp'
      }),
      val: error['@timestamp'],
      width: '50%'
    },
    {
      fieldName: REQUEST_URL_FULL,
      label: 'URL',
      val:
        idx(error, _ => _.context.page.url) ||
        idx(transaction, _ => _.context.request.url.full) ||
        NOT_AVAILABLE_LABEL,
      truncated: true,
      width: '50%'
    },
    {
      fieldName: REQUEST_METHOD,
      label: i18n.translate('xpack.apm.errorGroupDetails.requestMethodLabel', {
        defaultMessage: 'Request method'
      }),
      val: get(error, REQUEST_METHOD, NOT_AVAILABLE_LABEL),
      width: '25%'
    },
    {
      fieldName: ERROR_EXC_HANDLED,
      label: i18n.translate('xpack.apm.errorGroupDetails.handledLabel', {
        defaultMessage: 'Handled'
      }),
      val: String(get(error, ERROR_EXC_HANDLED, NOT_AVAILABLE_LABEL)),
      width: '25%'
    },
    {
      fieldName: TRANSACTION_ID,
      label: i18n.translate(
        'xpack.apm.errorGroupDetails.transactionSampleIdLabel',
        {
          defaultMessage: 'Transaction sample ID'
        }
      ),
      val: transactionLink || NOT_AVAILABLE_LABEL,
      width: '25%'
    },
    {
      fieldName: USER_ID,
      label: i18n.translate('xpack.apm.errorGroupDetails.userIdLabel', {
        defaultMessage: 'User ID'
      }),
      val: get(error, USER_ID, NOT_AVAILABLE_LABEL),
      width: '25%'
    }
  ];

  const tabs = getTabs(error);
  const currentTab = getCurrentTab(tabs, urlParams.detailTab);

  return (
    <Container>
      <HeaderContainer>
        <EuiTitle size="s">
          <h3>
            {i18n.translate(
              'xpack.apm.errorGroupDetails.errorOccurrenceTitle',
              {
                defaultMessage: 'Error occurrence'
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
                  'View {occurrencesCount} occurrences in Discover',
                values: { occurrencesCount }
              }
            )}
          </EuiButtonEmpty>
        </DiscoverErrorLink>
      </HeaderContainer>

      <PaddedContainer>
        <StickyProperties stickyProperties={stickyProperties} />
      </PaddedContainer>

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
                    detailTab: key
                  })
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

      <PaddedContainer>
        <TabContent error={error} currentTab={currentTab} />
      </PaddedContainer>
    </Container>
  );
}

function getTransactionLink(error: APMError, transaction?: Transaction) {
  if (!transaction || !get(error, 'transaction.sampled')) {
    return;
  }

  const path = `/${
    transaction.context.service.name
  }/transactions/${legacyEncodeURIComponent(
    transaction.transaction.type
  )}/${legacyEncodeURIComponent(transaction.transaction.name)}`;

  return (
    <KibanaLink
      hash={path}
      query={{
        transactionId: transaction.transaction.id,
        traceId: get(transaction, TRACE_ID)
      }}
    >
      {transaction.transaction.id}
    </KibanaLink>
  );
}

type MaybeStackframes = IStackframe[] | undefined;

export function TabContent({
  error,
  currentTab
}: {
  error: APMError;
  currentTab: Tab;
}) {
  const codeLanguage = error.context.service.name;
  const agentName = error.context.service.agent.name;
  const excStackframes: MaybeStackframes = get(error, ERROR_EXC_STACKTRACE);
  const logStackframes: MaybeStackframes = get(error, ERROR_LOG_STACKTRACE);

  switch (currentTab.key) {
    case logStacktraceTab.key:
      return (
        <Stacktrace stackframes={logStackframes} codeLanguage={codeLanguage} />
      );
    case exceptionStacktraceTab.key:
      return (
        <Stacktrace stackframes={excStackframes} codeLanguage={codeLanguage} />
      );
    default:
      const propData = error.context[currentTab.key] as any;
      return (
        <PropertiesTable
          propData={propData}
          propKey={currentTab.key}
          agentName={agentName}
        />
      );
  }
}

// Ensure the selected tab exists or use the first
export function getCurrentTab(tabs: Tab[] = [], selectedTabKey?: string) {
  const selectedTab = tabs.find(({ key }) => key === selectedTabKey);
  return selectedTab ? selectedTab : first(tabs) || {};
}

export function getTabs(error: APMError) {
  const hasLogStacktrace = get(error, ERROR_LOG_STACKTRACE, []).length > 0;
  const contextKeys = Object.keys(error.context);

  return [
    ...(hasLogStacktrace ? [logStacktraceTab] : []),
    exceptionStacktraceTab,
    ...getPropertyTabNames(contextKeys)
  ];
}
