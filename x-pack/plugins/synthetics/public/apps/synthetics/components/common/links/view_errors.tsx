/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useSyntheticsSettingsContext } from '../../../contexts';

export const ErrorsLink = ({ disabled }: { disabled?: boolean }) => {
  const { basePath } = useSyntheticsSettingsContext();

  return (
    <EuiToolTip content={VIEW_ERRORS}>
      <EuiButtonIcon
        aria-label={VIEW_ERRORS}
        href={`${basePath}/app/synthetics/errors`}
        iconType="inspect"
        isDisabled={disabled}
      />
    </EuiToolTip>
  );
};

const VIEW_ERRORS = i18n.translate('xpack.synthetics.monitorSummary.viewErrors', {
  defaultMessage: 'View errors',
});
