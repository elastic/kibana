/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import React from 'react';
import { EuiBadge, EuiBadgeGroup } from '@elastic/eui';
import { MonitorFilters } from './types';

export const ShowSelectedFilters = ({ filters }: { filters: MonitorFilters }) => {
  return (
    <EuiBadgeGroup gutterSize="s">
      <EuiBadge>
        {i18n.translate('xpack.synthetics.showSelectedFilters.badgeWithSimpleTextBadgeLabel', {
          defaultMessage: 'Badge with simple text being truncated',
        })}
      </EuiBadge>

      <EuiBadge iconType="clock">
        {i18n.translate('xpack.synthetics.showSelectedFilters.badgeWithIconBeingBadgeLabel', {
          defaultMessage: 'Badge with icon being truncated',
        })}
      </EuiBadge>

      <EuiBadge onClick={() => {}} onClickAriaLabel="Click this badge to...">
        {i18n.translate('xpack.synthetics.showSelectedFilters.badgeWithOnClickBeingBadgeLabel', {
          defaultMessage: 'Badge with onClick being truncated',
        })}
      </EuiBadge>

      <EuiBadge
        iconType="cross"
        iconSide="right"
        iconOnClick={() => {}}
        iconOnClickAriaLabel="Click this icon to..."
      >
        {i18n.translate(
          'xpack.synthetics.showSelectedFilters.badgeWithIconOnClickBeingBadgeLabel',
          { defaultMessage: 'Badge with iconOnClick being truncated' }
        )}
      </EuiBadge>

      <EuiBadge
        iconType="cross"
        iconSide="right"
        onClick={() => {}}
        onClickAriaLabel="Click this badge to..."
        iconOnClick={() => {}}
        iconOnClickAriaLabel="Click this icon to..."
      >
        {i18n.translate('xpack.synthetics.showSelectedFilters.badgeWithBothOnClicksBadgeLabel', {
          defaultMessage: 'Badge with both onClicks being truncated',
        })}
      </EuiBadge>
    </EuiBadgeGroup>
  );
};
