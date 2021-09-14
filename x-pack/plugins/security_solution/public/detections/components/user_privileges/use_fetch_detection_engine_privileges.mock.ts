/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetchDetectionEnginePrivileges } from './use_fetch_detection_engine_privileges';

export const useFetchDetectionEnginePrivilegesMock: () => jest.Mocked<
  ReturnType<typeof useFetchDetectionEnginePrivileges>
> = () => ({ loading: false, error: undefined, result: undefined });
