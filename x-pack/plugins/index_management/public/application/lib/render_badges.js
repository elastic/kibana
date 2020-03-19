/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge, EuiSearchBar } from '@elastic/eui';

export const renderBadges = (index, filterChanged, extensionsService) => {
  const badgeLabels = [];
  extensionsService.badges.forEach(({ matchIndex, label, color, filterExpression }) => {
    if (matchIndex(index)) {
      const clickHandler = () => {
        filterChanged &&
          filterExpression &&
          filterChanged(EuiSearchBar.Query.parse(filterExpression));
      };
      const ariaLabel = i18n.translate('xpack.idxMgmt.badgeAriaLabel', {
        defaultMessage: '{label}. Select to filter on this.',
        values: { label },
      });
      badgeLabels.push(
        <Fragment key={label}>
          {' '}
          <EuiBadge color={color} onClick={clickHandler} onClickAriaLabel={ariaLabel}>
            {label}
          </EuiBadge>
        </Fragment>
      );
    }
  });
  return <Fragment>{badgeLabels}</Fragment>;
};
