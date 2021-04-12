/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect } from 'react';
import { EuiCallOut, EuiButton, EuiSpacer } from '@elastic/eui';
import { useDispatch } from 'react-redux';
import { UptimeSettingsContext } from '../../../contexts';
import * as labels from './translations';
import { getMLCapabilitiesAction } from '../../../state/actions';

export const ShowLicenseInfo = () => {
  const { basePath } = useContext(UptimeSettingsContext);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getMLCapabilitiesAction.get());
  }, [dispatch]);

  return (
    <>
      <EuiCallOut
        data-test-subj="uptimeMLLicenseInfo"
        className="license-info-trial"
        title={labels.START_TRAIL}
        color="primary"
        iconType="help"
      >
        <p>{labels.START_TRAIL_DESC}</p>
        <EuiButton
          color="primary"
          href={basePath + `/app/management/stack/license_management/home`}
        >
          {labels.START_TRAIL}
        </EuiButton>
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};
