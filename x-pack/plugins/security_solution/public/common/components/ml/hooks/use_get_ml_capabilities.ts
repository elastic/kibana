/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMlCapabilities } from '../api/get_ml_capabilities';
import { useAsync, withOptionalSignal } from '../../../../shared_imports';

const _getMlCapabilities = withOptionalSignal(getMlCapabilities);

export const useGetMlCapabilities = () => useAsync(_getMlCapabilities);
