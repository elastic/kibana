/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ecs } from '../../../../../../cases/common';

// no alerts in observability so far
// dummy hook for now as hooks cannot be called conditionally
export const useFetchAlertData = (): [boolean, Record<string, Ecs>] => [false, {}];
