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
  getBadgeExtensions().forEach(({ matchIndex, label }) => {
    if (matchIndex(index)) {
      badgeLabels.push(label);
    }
  });
  return (
    <Fragment>
      {badgeLabels.map((badgeLabel) => {
        return (
          <Fragment key={badgeLabel}>
            {' '}<EuiBadge color="primary">{badgeLabel}</EuiBadge>
          </Fragment>
        );
      })}
    </Fragment>
  );
};