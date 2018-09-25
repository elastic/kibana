/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { capitalize, get, first } from 'lodash';
import { SERVICE_AGENT_NAME } from '../../../../../common/constants';
import { units, colors, px } from '../../../../style/variables';
import {
  getPropertyTabNames,
  PropertiesTable
} from '../../../shared/PropertiesTable';
import { history, toQuery, fromQuery } from '../../../../utils/url';
import { Tab } from '../../../shared/UIComponents';
import { WaterfallContainer } from './WaterfallContainer';

const TabContainer = styled.div`
  padding: 0 ${px(units.plus)};
  border-bottom: 1px solid ${colors.gray4};
`;

const TableContainer = styled.div`
  padding: ${px(units.plus)} ${px(units.plus)} 0;
`;

// Ensure the selected tab exists or use the first
function getCurrentTab(tabs = [], selectedTab) {
  return tabs.includes(selectedTab) ? selectedTab : first(tabs);
}

const TIMELINE_TAB = 'timeline';

function getTabs(transactionData) {
  const dynamicProps = Object.keys(transactionData.context || {});
  return [TIMELINE_TAB, ...getPropertyTabNames(dynamicProps)];
}

export function TransactionPropertiesTable({
  location,
  transaction,
  urlParams
}) {
  const tabs = getTabs(transaction);
  const currentTab = getCurrentTab(tabs, urlParams.detailTab);
  const agentName = get(transaction, SERVICE_AGENT_NAME);

  return (
    <div>
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
              {capitalize(key)}
            </Tab>
          );
        })}
      </TabContainer>

      {currentTab === TIMELINE_TAB && (
        <WaterfallContainer
          transaction={transaction}
          location={location}
          urlParams={urlParams}
        />
      )}

      {currentTab !== TIMELINE_TAB && (
        <TableContainer>
          <PropertiesTable
            propData={get(transaction.context, currentTab)}
            propKey={currentTab}
            agentName={agentName}
          />
        </TableContainer>
      )}
    </div>
  );
}

TransactionPropertiesTable.propTypes = {
  location: PropTypes.object.isRequired,
  transaction: PropTypes.object.isRequired,
  urlParams: PropTypes.object.isRequired
};
