/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type FlatObject<T> = { [Key in keyof T]: string };

export interface AppURLState {
  beatsKBar?: string;
  tagsKBar?: string;
  enrollmentToken?: string;
  createdTag?: string;
}
