/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export function getSelectedIdFromUrl(str: string): { id: string; isGroup: boolean };
export function getGroupQueryText(str: string): string;
export function clearSelectedJobIdFromUrl(str: string): void;
