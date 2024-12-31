/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge, IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  icon?: IconType;
}

export function BetaBadge({ icon }: Props) {
  return (
    <EuiBetaBadge
      label={i18n.translate('xpack.apm.betaBadgeLabel', {
        defaultMessage: 'Beta',
      })}
      title={i18n.translate('xpack.apm.betaBadgeLabel', {
        defaultMessage: 'Beta',
      })}
      tooltipContent={i18n.translate('xpack.apm.betaBadgeDescription', {
        defaultMessage:
          'This feature is currently in beta. If you encounter any bugs or have feedback, please open an issue or visit our discussion forum.',
      })}
      iconType={icon}
    />
  );
}
