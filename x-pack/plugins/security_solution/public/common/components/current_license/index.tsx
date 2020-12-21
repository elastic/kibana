/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FC, memo, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import { licenseService } from '../../hooks/use_license';
import { AppAction } from '../../store/actions';
import { ILicense } from '../../../../../licensing/common/types';

export const CurrentLicense: FC = memo(({ children }) => {
  const dispatch = useDispatch<Dispatch<AppAction>>();
  useEffect(() => {
    const subscription = licenseService
      .getLicenseInformation$()
      ?.subscribe((licenseInformation: ILicense) => {
        dispatch({
          type: 'licenseChanged',
          payload: licenseInformation,
        });
      });
    return () => subscription?.unsubscribe();
  }, [dispatch]);
  return <>{children}</>;
});

CurrentLicense.displayName = 'CurrentLicense';
