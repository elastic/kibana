/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useContext, useState, useEffect } from 'react';
import { EuiCallOut, EuiButton, EuiSpacer } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { UptimeSettingsContext } from '../../../contexts';
import * as labels from './translations';
import { getMLCapabilitiesAction } from '../../../state/actions';
import { hasMLFeatureSelector } from '../../../state/selectors';

export const ShowLicenseInfo = () => {
  const { basePath } = useContext(UptimeSettingsContext);
  const [loading, setLoading] = useState<boolean>(false);
  const hasMlFeature = useSelector(hasMLFeatureSelector);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getMLCapabilitiesAction.get());
  }, [dispatch]);

  useEffect(() => {
    let retryInterval: any;
    if (loading) {
      retryInterval = setInterval(() => {
        dispatch(getMLCapabilitiesAction.get());
      }, 5000);
    } else {
      clearInterval(retryInterval);
    }

    return () => {
      clearInterval(retryInterval);
    };
  }, [dispatch, loading]);

  useEffect(() => {
    setLoading(false);
  }, [hasMlFeature]);

  const startLicenseTrial = () => {
    setLoading(true);
  };

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
        <span onClick={startLicenseTrial} onKeyDown={() => {}}>
          <EuiButton
            color="primary"
            isLoading={loading}
            target="_blank"
            href={basePath + `/app/management/stack/license_management/home`}
          >
            {labels.START_TRAIL}
          </EuiButton>
        </span>
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};
