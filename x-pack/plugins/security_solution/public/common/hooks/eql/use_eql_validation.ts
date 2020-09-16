/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useAsync, withOptionalSignal } from '../../../shared_imports';
import { validateEql } from './api';

const validateEqlWithOptionalSignal = withOptionalSignal(validateEql);

export const useEqlValidation = () => useAsync(validateEqlWithOptionalSignal);
