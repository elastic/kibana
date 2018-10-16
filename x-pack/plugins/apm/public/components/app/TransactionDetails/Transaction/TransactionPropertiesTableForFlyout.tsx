/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { capitalize, first, get } from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import styled from 'styled-components';
import { SERVICE_AGENT_NAME } from '../../../../../common/constants';
import { Transaction } from '../../../../../typings/Transaction';
import { colors, px, units } from '../../../../style/variables';
// @ts-ignore
import { fromQuery, history, toQuery } from '../../../../utils/url';
import {
  getPropertyTabNames,
  PropertiesTable
} from '../../../shared/PropertiesTable';
// @ts-ignore
import { Tab } from '../../../shared/UIComponents';
import { IUrlParams } from './WaterfallContainer/Waterfall';

const TabContainer = styled.div`
  padding: 0 ${px(units.plus)};
  border-bottom: 1px solid ${colors.gray4};
`;

const TableContainer = styled.div`
  padding: ${px(units.plus)} ${px(units.plus)} 0;
`;

// Ensure the selected tab exists or use the first
function getCurrentTab(tabs: string[] = [], selectedTab: string) {
  return tabs.includes(selectedTab) ? selectedTab : first(tabs);
}

function getTabs(transactionData: Transaction) {
  const dynamicProps = Object.keys(transactionData.context);
  return getPropertyTabNames(dynamicProps);
}

interface Props {
  location: Location;
  transaction: Transaction;
  urlParams: IUrlParams;
}

export const TransactionPropertiesTableForFlyout: React.SFC<Props> = ({
  location,
  transaction,
  urlParams
}) => {
  const tabs = getTabs(transaction);
  const currentTab = getCurrentTab(tabs, urlParams.flyoutDetailTab);
  const agentName = get(transaction, SERVICE_AGENT_NAME, 'n/a');

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
                    flyoutDetailTab: key
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

      <TableContainer>
        <PropertiesTable
          propData={get(transaction.context, currentTab)}
          propKey={currentTab}
          agentName={agentName}
        />
      </TableContainer>
    </div>
  );
};

TransactionPropertiesTableForFlyout.propTypes = {
  location: PropTypes.object.isRequired,
  transaction: PropTypes.object.isRequired,
  urlParams: PropTypes.object.isRequired
};
