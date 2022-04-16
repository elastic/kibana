/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SerializableRecord } from '@kbn/utility-types';
import { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';

export type MapEmbeddablePersistableState = EmbeddableStateWithType & {
  attributes: SerializableRecord;
};
