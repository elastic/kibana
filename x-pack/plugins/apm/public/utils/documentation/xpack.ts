/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { metadata } from 'ui/metadata';
const STACK_VERSION = metadata.branch;

const XPACK_URL_ROOT = `https://www.elastic.co/guide/en/x-pack/${STACK_VERSION}`;

export const XPACK_DOCS = {
  xpackEmails: `${XPACK_URL_ROOT}/actions-email.html#configuring-email`,
  xpackWatcher: `${XPACK_URL_ROOT}/watcher-getting-started.html`
};
