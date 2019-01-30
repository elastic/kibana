/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, { Fragment } from 'react';
import { EuiBadge, EuiSearchBar } from '@elastic/eui';
import { getBadgeExtensions } from '../index_management_extensions';
export const renderBadges = (index, filterChanged) => {
  const badgeLabels = [];
  getBadgeExtensions().forEach(({ matchIndex, label, color, filterExpression }) => {
    if (matchIndex(index)) {
      const clickHandler = () => {
        filterChanged
          && filterExpression
          && filterChanged(EuiSearchBar.Query.parse(filterExpression));
      };
      badgeLabels.push(
        <Fragment key={label}>
          {' '}
          <EuiBadge
            color={color}
            onClick={clickHandler}
          >
            {label}
          </EuiBadge>
        </Fragment>
      );
    }
  });
  return (
    <Fragment>
      {badgeLabels}
    </Fragment>
  );
};