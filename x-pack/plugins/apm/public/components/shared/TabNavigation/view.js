/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { TabLink } from '../UIComponents';
import styled from 'styled-components';
import withService from '../withService';
import {
  unit,
  units,
  px,
  colors,
  fontSizes,
  truncate
} from '../../../style/variables';
import { isEmpty } from 'lodash';

import TooltipOverlay from '../../shared/TooltipOverlay';

const Container = styled.div`
  display: flex;
  box-shadow: 0 1px 0 ${colors.gray4};
  margin: 0 0 ${px(units.double)} 0;
`;

const Divider = styled.div`
  border-left: 1px solid ${colors.gray4};
  height: ${px(units.double)};
  margin: ${px(units.half + units.eighth)} ${px(unit)} ${px(units.half)};
  display: inline-block;
  vertical-align: middle;
`;

const EmptyMessage = styled.div`
  display: inline-block;
  font-size: ${fontSizes.large};
  color: ${colors.gray3};
  padding: ${px(unit)} ${px(unit + units.quarter)};
  border-bottom: 2px solid transparent;
`;

const NavLink = styled(TabLink)`
  ${truncate(px(units.half * 27))};
`;

// TODO: This is duplicated in TransactionOverview
function transactionTypeLabel(type) {
  switch (type) {
    case 'request':
      return 'Request';
    case 'page-load':
      return 'Page load';
    default:
      return type;
  }
}

function TabNavigation({ urlParams, location, service }) {
  const { serviceName, transactionType } = urlParams;
  const errorsSelected = location.pathname.includes('/errors');
  const { types } = service.data;

  return (
    <Container>
      {types.map(type => {
        const label = transactionTypeLabel(type);
        return (
          <TooltipOverlay
            content={
              <span>
                Transaction type:<br />
                {label}
              </span>
            }
            key={type}
          >
            <NavLink
              path={`/${serviceName}/transactions/${encodeURIComponent(type)}`}
              selected={transactionType === type && !errorsSelected}
            >
              {label}
            </NavLink>
          </TooltipOverlay>
        );
      })}
      {isEmpty(types) && (
        <EmptyMessage>No transactions available.</EmptyMessage>
      )}
      <Divider />
      <TabLink path={`/${serviceName}/errors`} selected={errorsSelected}>
        Errors
      </TabLink>
    </Container>
  );
}

TabNavigation.propTypes = {
  location: PropTypes.object.isRequired
};

export default withService(TabNavigation);
