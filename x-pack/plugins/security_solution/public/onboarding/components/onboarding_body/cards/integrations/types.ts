/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export interface Tab {
  category: string;
  customCardNames?: string[]; // custom card name e.g.: 1password
  iconType?: string;
  id: string;
  label: string;
  showSearchTools?: boolean;
  subCategory?: string;
}
