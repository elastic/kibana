/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { EuiBetaBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  icon?: IconType;
}

export function BetaBadge({ icon }: Props) {
  const badgeLabel = i18n.translate('xpack.apm.betaBadgeLabel', {
    defaultMessage: 'Beta',
  });

  const badgeDescription = i18n.translate('xpack.apm.betaBadgeDescription', {
    defaultMessage:
      'This feature is currently in beta. If you encounter any bugs or have feedback, please open an issue or visit our discussion forum.',
  });

  return (
    <EuiBetaBadge
      label={badgeLabel}
      title={badgeLabel}
      aria-label={badgeDescription}
      tooltipContent={badgeDescription}
      iconType={icon}
    />
  );
}
