/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
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

import { ContextProperties } from '../../../shared/ContextProperties';
import { Tab, HeaderMedium } from '../../../shared/UIComponents';
import DiscoverButton from '../../../shared/DiscoverButton';
import {
  PropertiesTable,
  getLevelOneProps
} from '../../../shared/PropertiesTable';
import Stacktrace from '../../../shared/Stacktrace';
import {
  SERVICE_NAME,
  ERROR_GROUP_ID,
  SERVICE_AGENT_NAME,
  SERVICE_LANGUAGE_NAME
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
    ...getLevelOneProps(dynamicProps)
  ];
}

function DetailView({ errorGroup, urlParams, location }) {
  if (errorGroup.status !== STATUS.SUCCESS) {
    return null;
  }

  if (isEmpty(errorGroup.data.error)) {
    return null;
  }

  const { serviceName } = urlParams;

  const timestamp = get(errorGroup, 'data.error.@timestamp');
  const url = get(errorGroup.data.error, 'context.request.url.full', 'N/A');

  const stickyProperties = [
    {
      label: 'Request method',
      fieldName: 'context.request.method',
      val: get(errorGroup.data, 'error.context.request.method', 'N/A')
    },
    {
      label: 'Handled',
      fieldName: 'error.exception.handled',
      val: get(errorGroup.data, 'error.error.exception.handled', 'N/A')
    },
    {
      label: 'User ID',
      fieldName: 'context.user.id',
      val: get(errorGroup.data, 'error.context.user.id', 'N/A')
    }
  ];

  const excStackframes = get(
    errorGroup.data.error.error,
    'exception.stacktrace'
  );
  const logStackframes = get(errorGroup.data.error.error, 'log.stacktrace');

  const codeLanguage = get(errorGroup.data.error, SERVICE_LANGUAGE_NAME);

  const context = get(errorGroup.data.error, 'context', {});

  const tabs = getTabs(context, logStackframes);

  const currentTab = getCurrentTab(tabs, urlParams.detailTab);

  const occurencesCount = errorGroup.data.occurrencesCount;
  const groupId = errorGroup.data.groupId;

  const agentName = get(errorGroup.data.error, SERVICE_AGENT_NAME);

  const discoverQuery = {
    _a: {
      interval: 'auto',
      query: {
        language: 'lucene',
        query: `${SERVICE_NAME}:"${serviceName}" AND ${ERROR_GROUP_ID}:${groupId}`
      },
      sort: { '@timestamp': 'desc' }
    }
  };

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
        <DiscoverButton query={discoverQuery}>
          {`View ${occurencesCount} occurences in Discover`}
        </DiscoverButton>
      </HeaderContainer>

      <ContextProperties
        timestamp={timestamp}
        url={url}
        stickyProperties={stickyProperties}
      />

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
