/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import {
  unit,
  units,
  px,
  colors,
  borderRadius
} from '../../../../style/variables';
import { get, capitalize, isEmpty } from 'lodash';
import { STATUS } from '../../../../constants';
import { StickyProperties } from '../../../shared/StickyProperties';
import { Tab, HeaderMedium } from '../../../shared/UIComponents';
import { DiscoverErrorButton } from '../../../shared/DiscoverButtons/DiscoverErrorButton';
import {
  PropertiesTable,
  getPropertyTabNames
} from '../../../shared/PropertiesTable';
import { Stacktrace } from '../../../shared/Stacktrace';
import {
  SERVICE_AGENT_NAME,
  SERVICE_LANGUAGE_NAME,
  USER_ID,
  REQUEST_URL_FULL,
  REQUEST_METHOD,
  ERROR_EXC_HANDLED,
  ERROR_LOG_STACKTRACE,
  ERROR_EXC_STACKTRACE
} from '../../../../../common/constants';
import { fromQuery, toQuery, history } from '../../../../utils/url';

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

// Ensure the selected tab exists or use the first
function getCurrentTab(tabs = [], selectedTab) {
  return tabs.includes(selectedTab) ? selectedTab : tabs[0];
}

function getTabs(context, logStackframes) {
  const dynamicProps = Object.keys(context);
  return [
    ...(logStackframes ? [LOG_STACKTRACE_TAB] : []),
    EXC_STACKTRACE_TAB,
    ...getPropertyTabNames(dynamicProps)
  ];
}

function DetailView({ errorGroup, urlParams, location }) {
  if (errorGroup.status !== STATUS.SUCCESS) {
    return null;
  }

  if (isEmpty(errorGroup.data.error)) {
    return null;
  }

  const stickyProperties = [
    {
      fieldName: '@timestamp',
      label: 'Timestamp',
      val: get(errorGroup.data.error, '@timestamp'),
      width: '50%'
    },
    {
      fieldName: REQUEST_URL_FULL,
      label: 'URL',
      val: get(errorGroup.data.error, REQUEST_URL_FULL, 'N/A'),
      truncated: true,
      width: '50%'
    },
    {
      fieldName: REQUEST_METHOD,
      label: 'Request method',
      val: get(errorGroup.data.error, REQUEST_METHOD, 'N/A'),
      width: '25%'
    },
    {
      fieldName: ERROR_EXC_HANDLED,
      label: 'Handled',
      val: get(errorGroup.data.error, ERROR_EXC_HANDLED, 'N/A'),
      width: '25%'
    },
    {
      fieldName: USER_ID,
      label: 'User ID',
      val: get(errorGroup.data.error, USER_ID, 'N/A'),
      width: '50%'
    }
  ];

  const excStackframes = get(errorGroup.data.error, ERROR_EXC_STACKTRACE);
  const logStackframes = get(errorGroup.data.error, ERROR_LOG_STACKTRACE);
  const codeLanguage = get(errorGroup.data.error, SERVICE_LANGUAGE_NAME);
  const context = get(errorGroup.data.error, 'context', {});
  const tabs = getTabs(context, logStackframes);
  const currentTab = getCurrentTab(tabs, urlParams.detailTab);
  const occurencesCount = errorGroup.data.occurrencesCount;
  const agentName = get(errorGroup.data.error, SERVICE_AGENT_NAME);

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
        <DiscoverErrorButton
          error={errorGroup.data.error}
          kuery={urlParams.kuery}
        >
          <EuiButtonEmpty iconType="discoverApp">
            {`View ${occurencesCount} occurences in Discover`}
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
        <TabContent
          currentTab={currentTab}
          logStackframes={logStackframes}
          excStackframes={excStackframes}
          codeLanguage={codeLanguage}
          errorGroup={errorGroup}
          agentName={agentName}
        />
      </TabContentContainer>
    </Container>
  );
}

function TabContent({
  currentTab,
  logStackframes,
  excStackframes,
  codeLanguage,
  errorGroup,
  agentName
}) {
  switch (currentTab) {
    case LOG_STACKTRACE_TAB:
      return (
        <Stacktrace stackframes={logStackframes} codeLanguage={codeLanguage} />
      );
    case EXC_STACKTRACE_TAB:
      return (
        <Stacktrace stackframes={excStackframes} codeLanguage={codeLanguage} />
      );
    default:
      return (
        <PropertiesTable
          propData={errorGroup.data.error.context[currentTab]}
          propKey={currentTab}
          agentName={agentName}
        />
      );
  }
}

DetailView.propTypes = {
  location: PropTypes.object.isRequired
};

export default DetailView;
