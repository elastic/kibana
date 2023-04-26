/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { PROFILE_VALUES_ENUM } from '../../../../../../../common/constants/monitor_defaults';
import { ConnectionProfile } from './connection_profile';
import { PROFILE_OPTIONS } from './throttling_config_field';
import { ThrottlingConfig } from '../../../../../../../common/runtime_types';

export const useConnectionProfiles = (initialValue?: ThrottlingConfig) => {
  return useMemo(() => {
    return [
      ...PROFILE_OPTIONS,
      {
        value: PROFILE_VALUES_ENUM.CUSTOM,
        inputDisplay: (
          <ConnectionProfile
            id="custom"
            throttling={initialValue?.id === PROFILE_VALUES_ENUM.CUSTOM ? initialValue : undefined}
          />
        ),
        'data-test-subj': 'syntheticsThrottlingSelectCustom',
      },
    ];
  }, [initialValue]);
};
