/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiIcon, EuiToolTip } from '@elastic/eui';

import type { FleetAuthz } from '../../../../../../../../common';

import { useAuthz } from '../../../../../../../hooks';

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
      'This package has at least one deferred installation which requires additional permissions to install and operate correctly.',
  }
);

export const getDeferredInstallationMsg = (
  numOfDeferredInstallations: number | undefined | null,
  { authz }: { authz: FleetAuthz }
) => {
  const canReauthorizeTransforms =
    authz?.packagePrivileges?.transform?.actions?.canStartStopTransform?.executePackageAction ??
    false;

  if (!numOfDeferredInstallations) return DEFERRED_ASSETS_WARNING_MSG;

  if (canReauthorizeTransforms) {
    return i18n.translate(
      'xpack.fleet.epm.packageDetails.assets.reauthorizeDeferredInstallationsMsg',
      {
        defaultMessage:
          'This package has {numOfDeferredInstallations, plural, one {one deferred installation} other {# deferred installations}}. Complete the installation to operate the package correctly.',
        values: { numOfDeferredInstallations },
      }
    );
  }

  return i18n.translate('xpack.fleet.epm.packageDetails.assets.deferredInstallationsWarning', {
    defaultMessage:
      'This package has {numOfDeferredInstallations, plural, one {one deferred installation which requires} other {# deferred installations which require}} additional permissions to install and operate correctly.',
    values: { numOfDeferredInstallations },
  });
};

export const DeferredAssetsWarning = ({
  numOfDeferredInstallations,
}: {
  numOfDeferredInstallations?: number;
}) => {
  const authz = useAuthz();

  const tooltipContent = useMemo(
    () => getDeferredInstallationMsg(numOfDeferredInstallations, { authz }),
    [numOfDeferredInstallations, authz]
  );

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
