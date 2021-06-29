/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableState } from 'src/plugins/kibana_utils/common';
import type { MlUrlGeneratorState } from './ml_url_generator';

export type MlLocatorParams = MlUrlGeneratorState & SerializableState;
