/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSpacer, EuiCallOut } from '@elastic/eui';

import * as i18n from './translations';
import { SNStoreButton } from './sn_store_button';

interface Props {
  appId: string;
}

const InstallationCalloutComponent: React.FC<Props> = ({ appId }) => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        size="m"
        iconType="alert"
        color="warning"
        data-test-subj="snInstallationCallout"
        title={i18n.INSTALLATION_CALLOUT_TITLE}
      >
        <SNStoreButton color="warning" appId={appId} />
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};

export const InstallationCallout = memo(InstallationCalloutComponent);
