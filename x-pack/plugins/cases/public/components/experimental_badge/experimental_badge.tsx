/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiBetaBadgeProps } from '@elastic/eui';
import { EuiBetaBadge } from '@elastic/eui';
import { css } from '@emotion/react';
import { EXPERIMENTAL_LABEL, EXPERIMENTAL_DESC } from '../../common/translations';

interface Props {
  icon?: boolean;
  size?: EuiBetaBadgeProps['size'];
}

const ExperimentalBadgeComponent: React.FC<Props> = ({ icon = false, size = 's' }) => {
  const props: EuiBetaBadgeProps = {
    label: EXPERIMENTAL_LABEL,
    size,
    ...(icon && { iconType: 'beaker' }),
    tooltipContent: EXPERIMENTAL_DESC,
    tooltipPosition: 'bottom' as const,
    'data-test-subj': 'case-experimental-badge',
  };

  return (
    <EuiBetaBadge
      css={css`
        margin-left: 5px;
      `}
      {...props}
    />
  );
};

ExperimentalBadgeComponent.displayName = 'ExperimentalBadge';

export const ExperimentalBadge = React.memo(ExperimentalBadgeComponent);
