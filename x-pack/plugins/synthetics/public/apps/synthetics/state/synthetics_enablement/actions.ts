/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from '@reduxjs/toolkit';
import { MonitorManagementEnablementResult } from '../../../../../common/runtime_types';
import { IHttpSerializedFetchError } from '../utils/http_error';

export const getSyntheticsEnablement = createAction('[SYNTHETICS_ENABLEMENT] GET');
export const getSyntheticsEnablementSuccess = createAction<MonitorManagementEnablementResult>(
  '[SYNTHETICS_ENABLEMENT] GET SUCCESS'
);
export const getSyntheticsEnablementFailure = createAction<IHttpSerializedFetchError>(
  '[SYNTHETICS_ENABLEMENT] GET FAILURE'
);

export const disableSynthetics = createAction('[SYNTHETICS_ENABLEMENT] DISABLE');
export const disableSyntheticsSuccess = createAction<{}>('[SYNTHETICS_ENABLEMENT] DISABLE SUCCESS');
export const disableSyntheticsFailure = createAction<IHttpSerializedFetchError>(
  '[SYNTHETICS_ENABLEMENT] DISABLE FAILURE'
);

export const enableSynthetics = createAction('[SYNTHETICS_ENABLEMENT] ENABLE');
export const enableSyntheticsSuccess = createAction<{}>('[SYNTHETICS_ENABLEMENT] ENABLE SUCCESS');
export const enableSyntheticsFailure = createAction<IHttpSerializedFetchError>(
  '[SYNTHETICS_ENABLEMENT] ENABLE FAILURE'
);
