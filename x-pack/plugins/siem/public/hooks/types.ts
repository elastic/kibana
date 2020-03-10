/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SimpleSavedObject } from '../../../../../src/core/public';

export interface IndexPatternSavedObjectAttributes {
  title: string;
}

export type IndexPatternSavedObject = Pick<
  SimpleSavedObject<IndexPatternSavedObjectAttributes>,
  'type' | 'id' | 'attributes' | '_version'
>;
