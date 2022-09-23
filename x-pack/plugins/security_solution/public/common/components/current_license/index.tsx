/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import type { Dispatch } from 'redux';
import type { ILicense } from '@kbn/licensing-plugin/common/types';
import { licenseService } from '../../hooks/use_license';
import type { AppAction } from '../../store/actions';

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
