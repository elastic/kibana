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

// Ensure the selected group exists or use the first
function getCurrentPropertyGroup(groups = [], selectedGroup) {
  return groups.includes(selectedGroup) ? selectedGroup : first(groups);
}

const TIMELINE_GROUP = 'timeline';

function getPropertyGroups(transactionData, { includeTimeline }) {
  const defaultGroups = getPropertyTabNames(
    Object.keys(transactionData.context || {})
  );
  return includeTimeline ? [TIMELINE_GROUP, ...defaultGroups] : defaultGroups;
}

function CurrentView({ currentGroup, location, transaction, urlParams }) {
  const agentName = get(transaction, SERVICE_AGENT_NAME);
  if (currentGroup === TIMELINE_GROUP) {
    return (
      <WaterfallContainer
        transaction={transaction}
        location={location}
        urlParams={urlParams}
      />
    );
  } else {
    return (
      <TableContainer>
        <PropertiesTable
          propData={get(transaction.context, currentGroup)}
          propKey={currentGroup}
          agentName={agentName}
        />
      </TableContainer>
    );
  }
}

export function TransactionPropertiesTable(props) {
  const { location, transaction, urlParams, includeTimeline = true } = props;
  const propertyGroups = getPropertyGroups(transaction, { includeTimeline });
  const currentGroup = getCurrentPropertyGroup(
    propertyGroups,
    urlParams.detailTab
  );

  return (
    <div>
      <TabContainer>
        {propertyGroups.map(key => {
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
              selected={currentGroup === key}
              key={key}
            >
              {capitalize(key)}
            </Tab>
          );
        })}
      </TabContainer>
      <CurrentView currentGroup={currentGroup} {...props} />
    </div>
  );
}

TransactionPropertiesTable.propTypes = {
  location: PropTypes.object.isRequired,
  transaction: PropTypes.object.isRequired,
  urlParams: PropTypes.object.isRequired
};
