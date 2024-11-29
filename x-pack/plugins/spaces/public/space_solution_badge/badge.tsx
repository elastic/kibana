/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiBadgeProps } from '@elastic/eui';
import { EuiBadge } from '@elastic/eui';
import React, { useMemo } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import type { Space } from '../../common';

const SolutionOptions: Record<
  NonNullable<Space['solution']>,
  { iconType: string; label: JSX.Element }
> = {
  es: {
    iconType: 'logoElasticsearch',
    label: (
      <FormattedMessage
        id="xpack.spaces.spaceSolutionBadge.elasticsearch"
        defaultMessage="Elasticsearch"
      />
    ),
  },
  security: {
    iconType: 'logoSecurity',
    label: (
      <FormattedMessage id="xpack.spaces.spaceSolutionBadge.security" defaultMessage="Security" />
    ),
  },
  oblt: {
    iconType: 'logoObservability',
    label: (
      <FormattedMessage
        id="xpack.spaces.spaceSolutionBadge.observability"
        defaultMessage="Observability"
      />
    ),
  },
  classic: {
    iconType: 'logoElasticStack',
    label: (
      <FormattedMessage id="xpack.spaces.spaceSolutionBadge.classic" defaultMessage="Classic" />
    ),
  },
};

export type SpaceSolutionBadgeProps = Omit<EuiBadgeProps, 'iconType'> & {
  solution?: Space['solution'];
};

export const SpaceSolutionBadge = ({ solution, ...badgeProps }: SpaceSolutionBadgeProps) => {
  const { iconType, label } = useMemo(() => {
    if (!solution || !SolutionOptions[solution]) {
      return SolutionOptions.classic;
    }

    return SolutionOptions[solution];
  }, [solution]);

  return (
    <EuiBadge {...(badgeProps as EuiBadgeProps)} iconType={iconType} color="hollow">
      {label}
    </EuiBadge>
  );
};
