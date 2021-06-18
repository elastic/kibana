/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KueryNode } from '../../../../../src/plugins/data/server';
import { SavedObjectFindOptions } from '../../common';

/**
 * This structure holds the alert ID and index from an alert comment
 */
export interface AlertInfo {
  id: string;
  index: string;
}

export type SavedObjectFindOptionsKueryNode = Omit<SavedObjectFindOptions, 'filter'> & {
  filter?: KueryNode;
};
