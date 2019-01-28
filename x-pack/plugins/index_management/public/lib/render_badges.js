/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, { Fragment } from 'react';
import { EuiBadge } from '@elastic/eui';
import { getBadgeExtensions } from '../index_management_extensions';
export const renderBadges = (index) => {
  const badgeLabels = [];
  getBadgeExtensions().forEach(({ matchIndex, label, color }) => {
    if (matchIndex(index)) {
      badgeLabels.push(
        <Fragment key={label}>
          {' '}<EuiBadge color={color}>{label}</EuiBadge>
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