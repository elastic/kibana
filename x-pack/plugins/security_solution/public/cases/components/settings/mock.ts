/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const connector = {
  id: '123',
  name: 'My connector',
  actionTypeId: '.jira',
  config: {},
  isPreconfigured: false,
};
export const issues = [
  { id: 'personId', title: 'Person Task', key: 'personKey' },
  { id: 'womanId', title: 'Woman Task', key: 'womanKey' },
  { id: 'manId', title: 'Man Task', key: 'manKey' },
  { id: 'cameraId', title: 'Camera Task', key: 'cameraKey' },
  { id: 'tvId', title: 'TV Task', key: 'tvKey' },
];
