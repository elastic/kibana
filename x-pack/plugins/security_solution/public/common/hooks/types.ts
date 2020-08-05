/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SimpleSavedObject } from '../../../../../../src/core/public';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type IndexPatternSavedObjectAttributes = { title: string };

export type IndexPatternSavedObject = Pick<
  SimpleSavedObject<IndexPatternSavedObjectAttributes>,
  'type' | 'id' | 'attributes' | '_version'
>;
