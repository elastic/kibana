/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge, Query } from '@elastic/eui';

import { ROLLUP_DEPRECATION_BADGE_LABEL, RollupDeprecationTooltip } from '@kbn/rollup';
import { ExtensionsService } from '../../services';
import { Index } from '../..';

export const renderBadges = (
  index: Index,
  extensionsService: ExtensionsService,
  onFilterChange?: (query: Query) => void
) => {
  const badgeLabels: ReactNode[] = [];
  extensionsService.badges.forEach((indexBadge) => {
    const { matchIndex, label, color, filterExpression } = indexBadge;
    if (matchIndex(index)) {
      const clickHandler = () => {
        if (onFilterChange && filterExpression) {
          onFilterChange(Query.parse(filterExpression));
        }
      };
      const ariaLabel = i18n.translate('xpack.idxMgmt.badgeAriaLabel', {
        defaultMessage: '{label}. Select to filter on this.',
        values: { label },
      });
      const badge =
        onFilterChange && filterExpression ? (
          <EuiBadge color={color} onClick={clickHandler} onClickAriaLabel={ariaLabel}>
            {label}
          </EuiBadge>
        ) : (
          <EuiBadge color={color}>{label}</EuiBadge>
        );
      const badgeItem =
        // If the badge is for Rollups, add a tooltip with deprecation information
        indexBadge.label === ROLLUP_DEPRECATION_BADGE_LABEL ? (
          <RollupDeprecationTooltip>{badge}</RollupDeprecationTooltip>
        ) : (
          badge
        );
      badgeLabels.push(<Fragment key={label}> {badgeItem}</Fragment>);
    }
  });
  return <Fragment>{badgeLabels}</Fragment>;
};
