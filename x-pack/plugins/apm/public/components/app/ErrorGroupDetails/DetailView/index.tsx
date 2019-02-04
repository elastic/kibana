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
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import { first, get, isEmpty } from 'lodash';
import React, { Fragment } from 'react';
import { RRRRenderResponse } from 'react-redux-request';
import styled from 'styled-components';
import {
  ERROR_EXC_HANDLED,
  HTTP_REQUEST_METHOD,
  TRANSACTION_ID,
  URL_FULL,
  USER_ID
} from 'x-pack/plugins/apm/common/constants';
import { NOT_AVAILABLE_LABEL } from 'x-pack/plugins/apm/common/i18n';
import { idx } from 'x-pack/plugins/apm/common/idx';
import { KibanaLink } from 'x-pack/plugins/apm/public/components/shared/Links/KibanaLink';
import {
  fromQuery,
  history,
  toQuery
} from 'x-pack/plugins/apm/public/components/shared/Links/url_helpers';
import { legacyEncodeURIComponent } from 'x-pack/plugins/apm/public/components/shared/Links/url_helpers';
import { STATUS } from 'x-pack/plugins/apm/public/constants';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { ErrorGroupAPIResponse } from 'x-pack/plugins/apm/server/lib/errors/get_error_group';
import { APMError } from 'x-pack/plugins/apm/typings/es_schemas/Error';
import { Transaction } from 'x-pack/plugins/apm/typings/es_schemas/Transaction';
import { borderRadius, px, unit, units } from '../../../../style/variables';
import { DiscoverErrorLink } from '../../../shared/Links/DiscoverLinks/DiscoverErrorLink';
import {
  getPropertyTabNames,
  PropertiesTable
} from '../../../shared/PropertiesTable';
import { Tab } from '../../../shared/PropertiesTable/propertyConfig';
import { Stacktrace } from '../../../shared/Stacktrace';
import { StickyProperties } from '../../../shared/StickyProperties';

const Container = styled.div`
  position: relative;
  border: 1px solid ${theme.euiColorLightShade};
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
      fieldName: URL_FULL,
      label: 'URL',
      val:
        idx(error, _ => _.context.page.url) ||
        idx(error, _ => _.url.full) ||
        NOT_AVAILABLE_LABEL,
      truncated: true,
      width: '50%'
    },
    {
      fieldName: HTTP_REQUEST_METHOD,
      label: i18n.translate('xpack.apm.errorGroupDetails.requestMethodLabel', {
        defaultMessage: 'Request method'
      }),
      val: idx(error, _ => _.http.request.method) || NOT_AVAILABLE_LABEL,
      width: '25%'
    },
    {
      fieldName: ERROR_EXC_HANDLED,
      label: i18n.translate('xpack.apm.errorGroupDetails.handledLabel', {
        defaultMessage: 'Handled'
      }),
      val:
        String(idx(error, _ => _.error.exception.handled)) ||
        NOT_AVAILABLE_LABEL,
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
      val: <TransactionLink transaction={transaction} error={error} />,
      width: '25%'
    },
    {
      fieldName: USER_ID,
      label: i18n.translate('xpack.apm.errorGroupDetails.userIdLabel', {
        defaultMessage: 'User ID'
      }),
      val: idx(error, _ => _.user.id) || NOT_AVAILABLE_LABEL,
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

interface TransactionLinkProps {
  error: APMError;
  transaction?: Transaction;
}

function TransactionLink({ error, transaction }: TransactionLinkProps) {
  if (!transaction) {
    return <Fragment>{NOT_AVAILABLE_LABEL}</Fragment>;
  }

  const isSampled = idx(error, _ => _.transaction.sampled);
  if (!isSampled) {
    return <Fragment>{transaction.transaction.id}</Fragment>;
  }

  const path = `/${
    transaction.service.name
  }/transactions/${legacyEncodeURIComponent(
    transaction.transaction.type
  )}/${legacyEncodeURIComponent(transaction.transaction.name)}`;

  return (
    <KibanaLink
      hash={path}
      query={{
        transactionId: transaction.transaction.id,
        traceId: idx(transaction, _ => _.trace.id)
      }}
    >
      {transaction.transaction.id}
    </KibanaLink>
  );
}

export function TabContent({
  error,
  currentTab
}: {
  error: APMError;
  currentTab: Tab;
}) {
  const codeLanguage = error.service.name;
  const agentName = error.agent.name;
  const excStackframes = idx(error, _ => _.error.exception.stacktrace);
  const logStackframes = idx(error, _ => _.error.exception.stacktrace);

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
      const propData = get(error, currentTab.key);
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
  const hasLogStacktrace = !isEmpty(idx(error, _ => _.error.log.stacktrace));
  return [
    ...(hasLogStacktrace ? [logStacktraceTab] : []),
    exceptionStacktraceTab,
    ...getPropertyTabNames(error)
  ];
}
