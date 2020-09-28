/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useAsync, withOptionalSignal } from '../../../shared_imports';
import { getEqlAggs } from './api';

const getEqlAggsWithOptionalSignal = withOptionalSignal(getEqlAggs);

export const useEqlAggs = () => useAsync(getEqlAggsWithOptionalSignal);
