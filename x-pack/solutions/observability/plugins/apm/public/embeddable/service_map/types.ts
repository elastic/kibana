/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializedTitles } from '@kbn/presentation-publishing';
import type { Environment } from '../../../common/environment_rt';

export interface ServiceMapEmbeddableState extends SerializedTitles {
  rangeFrom?: string;
  rangeTo?: string;
  environment?: Environment;
  kuery?: string;
  serviceName?: string;
  serviceGroupId?: string;
}
