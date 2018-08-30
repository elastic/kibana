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
  colors,
  px,
  borderRadius
} from '../../../../style/variables';
import { Tab, HeaderMedium } from '../../../shared/UIComponents';
import { isEmpty, capitalize, get, sortBy, last } from 'lodash';

import { ContextProperties } from '../../../shared/ContextProperties';
import {
  PropertiesTable,
  getLevelOneProps
} from '../../../shared/PropertiesTable';
import Spans from './Spans';
import DiscoverButton from '../../../shared/DiscoverButton';
import {
  TRANSACTION_ID,
  PROCESSOR_EVENT,
  SERVICE_AGENT_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_RESULT,
  USER_ID
} from '../../../../../common/constants';
import { fromQuery, toQuery, history } from '../../../../utils/url';
import { asTime } from '../../../../utils/formatters';
import EmptyMessage from '../../../shared/EmptyMessage';

const Container = styled.div`
  position: relative;
  border: 1px solid ${colors.gray4};
  border-radius: ${borderRadius};
  margin-top: ${px(units.plus)};
`;

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  padding: ${px(units.plus)} ${px(units.plus)} 0;
  margin-bottom: ${px(unit)};
`;

const TabContainer = styled.div`
  padding: 0 ${px(units.plus)};
  border-bottom: 1px solid ${colors.gray4};
`;

const TabContentContainer = styled.div`
  border-radius: 0 0 ${borderRadius} ${borderRadius};
`;

const PropertiesTableContainer = styled.div`
  padding: ${px(units.plus)} ${px(units.plus)} 0;
`;

const DEFAULT_TAB = 'timeline';

export function getAgentMarks(transaction) {
  const duration = get(transaction, TRANSACTION_DURATION);
  const threshold = (duration / 100) * 2;

  return sortBy(
    Object.entries(get(transaction, 'transaction.marks.agent', [])),
    '1'
  )
    .map(([name, ms]) => ({
      name,
      timeLabel: ms * 1000,
      timeAxis: ms * 1000
    }))
    .reduce((acc, curItem) => {
      const prevTime = get(last(acc), 'timeAxis');
      const nextValidTime = prevTime + threshold;
      const isTooClose = prevTime != null && nextValidTime > curItem.timeAxis;
      const canFit = nextValidTime <= duration;

      if (isTooClose && canFit) {
        acc.push({ ...curItem, timeAxis: nextValidTime });
      } else {
        acc.push(curItem);
      }
      return acc;
    }, [])
    .reduceRight((acc, curItem) => {
      const prevTime = get(last(acc), 'timeAxis');
      const nextValidTime = prevTime - threshold;
      const isTooClose = prevTime != null && nextValidTime < curItem.timeAxis;
      const canFit = nextValidTime >= 0;

      if (isTooClose && canFit) {
        acc.push({ ...curItem, timeAxis: nextValidTime });
      } else {
        acc.push(curItem);
      }
      return acc;
    }, [])
    .reverse();
}

// Ensure the selected tab exists or use the default
function getCurrentTab(tabs = [], detailTab) {
  return tabs.includes(detailTab) ? detailTab : DEFAULT_TAB;
}

function getTabs(transactionData) {
  const dynamicProps = Object.keys(transactionData.context || {});
  return getLevelOneProps(dynamicProps);
}

function Transaction({ transaction, location, urlParams }) {
  const { transactionId } = urlParams;

  if (isEmpty(transaction)) {
    return (
      <EmptyMessage
        heading="No transaction sample available."
        subheading="Try another time range, reset the search filter or select another bucket from the distribution histogram."
      />
    );
  }

  const timestamp = get(transaction, '@timestamp');
  const url = get(transaction, 'context.request.url.full', 'N/A');
  const duration = get(transaction, TRANSACTION_DURATION);
  const stickyProperties = [
    {
      label: 'Duration',
      fieldName: TRANSACTION_DURATION,
      val: duration ? asTime(duration) : 'N/A'
    },
    {
      label: 'Result',
      fieldName: TRANSACTION_RESULT,
      val: get(transaction, TRANSACTION_RESULT, 'N/A')
    },
    {
      label: 'User ID',
      fieldName: USER_ID,
      val: get(transaction, USER_ID, 'N/A')
    }
  ];

  const agentName = get(transaction, SERVICE_AGENT_NAME);
  const tabs = getTabs(transaction);
  const currentTab = getCurrentTab(tabs, urlParams.detailTab);

  const discoverQuery = {
    _a: {
      interval: 'auto',
      query: {
        language: 'lucene',
        query: `${PROCESSOR_EVENT}:transaction AND ${TRANSACTION_ID}:${transactionId}`
      },
      sort: { '@timestamp': 'desc' }
    }
  };

  return (
    <Container>
      <HeaderContainer>
        <HeaderMedium
          css={`
            margin-top: ${px(units.quarter)};
            margin-bottom: 0;
          `}
        >
          Transaction sample
        </HeaderMedium>
        <DiscoverButton query={discoverQuery}>
          {`View transaction in Discover`}
        </DiscoverButton>
      </HeaderContainer>

      <ContextProperties
        timestamp={timestamp}
        url={url}
        stickyProperties={stickyProperties}
      />

      <TabContainer>
        {[DEFAULT_TAB, ...tabs].map(key => {
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
              {capitalize(key)}
            </Tab>
          );
        })}
      </TabContainer>

      <TabContentContainer>
        {currentTab === DEFAULT_TAB ? (
          <Spans
            agentName={agentName}
            agentMarks={getAgentMarks(transaction)}
            droppedSpans={get(
              transaction,
              'transaction.spanCount.dropped.total',
              0
            )}
          />
        ) : (
          <PropertiesTableContainer>
            <PropertiesTable
              propData={get(transaction.context, currentTab)}
              propKey={currentTab}
              agentName={agentName}
            />
          </PropertiesTableContainer>
        )}
      </TabContentContainer>
    </Container>
  );
}

Transaction.propTypes = {
  urlParams: PropTypes.object.isRequired,
  transaction: PropTypes.object
};

Transaction.defaultProps = {
  transaction: {}
};

export default Transaction;
