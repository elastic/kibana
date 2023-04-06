/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIcon, EuiToolTip } from '@elastic/eui';

export const DEFERRED_ASSETS_WARNING_LABEL = i18n.translate(
  'xpack.fleet.packageCard.reauthorizationRequiredLabel',
  {
    defaultMessage: 'Reauthorization required',
  }
);

export const DEFERRED_ASSETS_WARNING_MSG = i18n.translate(
  'xpack.fleet.epm.packageDetails.assets.deferredInstallationsMsg',
  {
    defaultMessage:
      'This package has at least one deferred installation which might require additional permissions to install and operate correctly.',
  }
);

export const DeferredAssetsWarning = ({
  numOfDeferredInstallations,
}: {
  numOfDeferredInstallations?: number;
}) => {
  const tooltipContent =
    numOfDeferredInstallations !== undefined
      ? i18n.translate('xpack.fleet.epm.packageDetails.assets.deferredInstallationsCallout', {
          defaultMessage:
            'This package has {numOfDeferredInstallations, plural, one {one deferred installation} other {# deferred installations}} which might require additional permissions to install and operate correctly.',
          values: { numOfDeferredInstallations },
        })
      : DEFERRED_ASSETS_WARNING_MSG;
  return (
    <EuiToolTip
      display="inlineBlock"
      content={tooltipContent}
      title={DEFERRED_ASSETS_WARNING_LABEL}
    >
      <EuiIcon type={'alert'} color={'warning'} />
    </EuiToolTip>
  );
};
