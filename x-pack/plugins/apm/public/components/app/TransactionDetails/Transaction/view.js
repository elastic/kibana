/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import styled from 'styled-components';
import {
  unit,
  units,
  colors,
  px,
  borderRadius
} from '../../../../style/variables';
import { Tab, HeaderMedium } from '../../../shared/UIComponents';
import { isEmpty, capitalize, get } from 'lodash';

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
  SERVICE_AGENT_NAME
} from '../../../../../common/constants';
import { fromQuery, toQuery, history } from '../../../../utils/url';
import { asTime } from '../../../../utils/formatters';
import EmptyMessage from '../../../shared/EmptyMessage';
import { getKey } from '../../../../store/apiHelpers';

function loadTransaction(props) {
  const { serviceName, start, end, transactionId } = props.urlParams;
  const key = getKey({ serviceName, start, end, transactionId });

  if (key && props.transaction.key !== key) {
    props.loadTransaction({ serviceName, start, end, transactionId });
  }
}

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

// Ensure the selected tab exists or use the default
function getCurrentTab(tabs = [], detailTab) {
  return tabs.includes(detailTab) ? detailTab : DEFAULT_TAB;
}

function getTabs(transactionData) {
  const dynamicProps = Object.keys(transactionData.context || {});
  return getLevelOneProps(dynamicProps);
}

class Transaction extends Component {
  componentDidMount() {
    loadTransaction(this.props);
  }

  componentWillReceiveProps(nextProps) {
    loadTransaction(nextProps);
  }

  render() {
    const { transaction, location } = this.props;
    const { transactionId } = this.props.urlParams;

    if (isEmpty(transaction.data)) {
      return (
        <EmptyMessage
          heading="No transaction sample available for this time range."
          subheading="Please select another time range or another bucket from the distribution histogram."
        />
      );
    }

    const timestamp = get(transaction, 'data.@timestamp');
    const url = get(transaction.data, 'context.request.url.full', 'N/A');
    const duration = get(transaction.data, 'transaction.duration.us');
    const stickyProperties = [
      {
        label: 'Duration',
        fieldName: 'transaction.duration.us',
        val: duration ? asTime(duration) : 'N/A'
      },
      {
        label: 'Result',
        fieldName: 'transaction.result',
        val: get(transaction.data, 'transaction.result', 'N/A')
      },
      {
        label: 'User ID',
        fieldName: 'context.user.id',
        val: get(transaction.data, 'context.user.id', 'N/A')
      }
    ];

    const agentName = get(transaction.data, SERVICE_AGENT_NAME);
    const tabs = getTabs(transaction.data);
    const currentTab = getCurrentTab(tabs, this.props.urlParams.detailTab);

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
              droppedSpans={get(
                transaction.data,
                'transaction.spanCount.dropped.total',
                0
              )}
            />
          ) : (
            <PropertiesTableContainer>
              <PropertiesTable
                propData={get(transaction.data.context, currentTab)}
                propKey={currentTab}
                agentName={agentName}
              />
            </PropertiesTableContainer>
          )}
        </TabContentContainer>
      </Container>
    );
  }
}

export default Transaction;
