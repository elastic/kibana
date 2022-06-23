/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SimpleSavedObject } from '@kbn/core/public';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type IndexPatternSavedObjectAttributes = { title: string };

export type IndexPatternSavedObject = Pick<
  SimpleSavedObject<IndexPatternSavedObjectAttributes>,
  'type' | 'id' | 'attributes' | '_version'
>;
