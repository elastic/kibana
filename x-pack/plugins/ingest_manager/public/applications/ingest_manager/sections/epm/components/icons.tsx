/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiIconTip, EuiIconProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const UpdateIcon = ({ size = 'm' }: { size?: EuiIconProps['size'] }) => (
  <EuiIconTip
    aria-label={i18n.translate('xpack.ingestManager.epm.updateAvailableTooltip', {
      defaultMessage: 'Update available',
    })}
    size={size}
    type="alert"
    color="warning"
    content={i18n.translate('xpack.ingestManager.epm.updateAvailableTooltip', {
      defaultMessage: 'Update available',
    })}
  />
);
