/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';
import { RawAction } from '../../../types';

export type FindConnectorsSoResult = SavedObjectsFindResponse<RawAction>;
