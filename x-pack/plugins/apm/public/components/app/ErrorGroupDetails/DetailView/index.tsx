/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { capitalize, get } from 'lodash';
import React from 'react';
import { RRRRenderResponse } from 'react-redux-request';
import styled from 'styled-components';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { ErrorGroupAPIResponse } from 'x-pack/plugins/apm/server/lib/errors/get_error_group';
import { APMError } from 'x-pack/plugins/apm/typings/es_schemas/Error';
import { IStackframe } from 'x-pack/plugins/apm/typings/es_schemas/Stackframe';
import { Transaction } from 'x-pack/plugins/apm/typings/es_schemas/Transaction';
import {
  ERROR_EXC_HANDLED,
  ERROR_EXC_STACKTRACE,
  ERROR_LOG_STACKTRACE,
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
import {
  fromQuery,
  history,
  KibanaLink,
  legacyEncodeURIComponent,
  toQuery
} from '../../../../utils/url';
import { DiscoverErrorButton } from '../../../shared/DiscoverButtons/DiscoverErrorButton';
import {
  getPropertyTabNames,
  PropertiesTable
} from '../../../shared/PropertiesTable';
import { Stacktrace } from '../../../shared/Stacktrace';
import { StickyProperties } from '../../../shared/StickyProperties';
// @ts-ignore
import { HeaderMedium, Tab } from '../../../shared/UIComponents';

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

const TabContainer = styled.div`
  padding: 0 ${px(units.plus)};
  border-bottom: 1px solid ${colors.gray4};
`;

const TabContentContainer = styled.div`
  padding: ${px(units.plus)} ${px(units.plus)} 0;
`;

const EXC_STACKTRACE_TAB = 'exception_stacktrace';
const LOG_STACKTRACE_TAB = 'log_stacktrace';

export function DetailView({ errorGroup, urlParams, location }: Props) {
  if (errorGroup.status !== STATUS.SUCCESS) {
    return null;
  }
  const { transaction, error, occurrencesCount } = errorGroup.data;

  if (!error) {
    return null;
  }

  const transactionLink = getTransactionLink(transaction);
  const stickyProperties = [
    {
      fieldName: '@timestamp',
      label: 'Timestamp',
      val: error['@timestamp'],
      width: '50%'
    },
    {
      fieldName: REQUEST_URL_FULL,
      label: 'URL',
      val: get(error, REQUEST_URL_FULL, 'N/A'),
      truncated: true,
      width: '50%'
    },
    {
      fieldName: REQUEST_METHOD,
      label: 'Request method',
      val: get(error, REQUEST_METHOD, 'N/A'),
      width: '25%'
    },
    {
      fieldName: ERROR_EXC_HANDLED,
      label: 'Handled',
      val: get(error, ERROR_EXC_HANDLED, 'N/A'),
      width: '25%'
    },
    {
      fieldName: TRANSACTION_ID,
      label: 'Transaction sample ID',
      val: transactionLink || 'N/A',
      width: '25%'
    },
    {
      fieldName: USER_ID,
      label: 'User ID',
      val: get(error, USER_ID, 'N/A'),
      width: '25%'
    }
  ];

  const tabs = getTabs(error);
  const currentTab = getCurrentTab(tabs, urlParams.detailTab);

  return (
    <Container>
      <HeaderContainer>
        <HeaderMedium
          css={`
            margin: 0;
          `}
        >
          Error occurrence
        </HeaderMedium>
        <DiscoverErrorButton error={error} kuery={urlParams.kuery}>
          <EuiButtonEmpty iconType="discoverApp">
            {`View ${occurrencesCount} occurences in Discover`}
          </EuiButtonEmpty>
        </DiscoverErrorButton>
      </HeaderContainer>

      <TabContentContainer>
        <StickyProperties stickyProperties={stickyProperties} />
      </TabContentContainer>

      <TabContainer>
        {tabs.map(key => {
          return (
            <Tab
              onClick={() => {
                history.replace({
                  ...location,
                  search: fromQuery({
                    ...toQuery(location.search),
                    detailTab: key
                  })
                });
              }}
              selected={currentTab === key}
              key={key}
            >
              {capitalize(key.replace('_', ' '))}
            </Tab>
          );
        })}
      </TabContainer>

      <TabContentContainer>
        <TabContent currentTab={currentTab} error={error} />
      </TabContentContainer>
    </Container>
  );
}

// Ensure the selected tab exists or use the first
function getCurrentTab(tabs: string[] = [], selectedTab?: string) {
  return tabs.includes(selectedTab!) ? selectedTab : tabs[0];
}

function getTabs(error: APMError) {
  const logStackframes = get(error, ERROR_LOG_STACKTRACE, []).length;
  const context = error.context;

  const contextKeys = Object.keys(context);
  return [
    ...(logStackframes > 0 ? [LOG_STACKTRACE_TAB] : []),
    EXC_STACKTRACE_TAB,
    ...getPropertyTabNames(contextKeys)
  ];
}

interface Props {
  errorGroup: RRRRenderResponse<ErrorGroupAPIResponse>;
  urlParams: IUrlParams;
  location: any;
}

function getTransactionLink(transaction?: Transaction) {
  if (!transaction) {
    return;
  }

  const path = `/${
    transaction.context.service.name
  }/transactions/${legacyEncodeURIComponent(
    transaction.transaction.type
  )}/${legacyEncodeURIComponent(transaction.transaction.name)}`;

  return (
    <KibanaLink
      pathname={'/app/apm'}
      hash={path}
      query={{
        transactionId: transaction.transaction.id,
        traceid: get(transaction, TRACE_ID)
      }}
    >
      {transaction.transaction.id}
    </KibanaLink>
  );
}

interface TabContentProps {
  currentTab?: string;
  error: APMError;
}

type MaybeStackframes = IStackframe[] | undefined;

function TabContent({ currentTab, error }: TabContentProps) {
  const codeLanguage = error.context.service.name;
  const agentName = error.context.service.agent.name;
  const excStackframes: MaybeStackframes = get(error, ERROR_EXC_STACKTRACE);
  const logStackframes: MaybeStackframes = get(error, ERROR_LOG_STACKTRACE);

  switch (currentTab) {
    case LOG_STACKTRACE_TAB:
    case undefined:
      return (
        <Stacktrace stackframes={logStackframes} codeLanguage={codeLanguage} />
      );
    case EXC_STACKTRACE_TAB:
      return (
        <Stacktrace stackframes={excStackframes} codeLanguage={codeLanguage} />
      );
    default:
      const propData = error.context[currentTab] as any;
      return (
        <PropertiesTable
          propData={propData}
          propKey={currentTab}
          agentName={agentName}
        />
      );
  }
}
