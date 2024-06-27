/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TIKA_TYPES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'text/rtf',
  'application/pdf',
  'text/plain',
];

export function isTikaType(type: string) {
  return TIKA_TYPES.includes(type);
}

export const getTikaDisplayType = (type: string) => {
  switch (type) {
    case 'application/msword':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'Microsoft Office Word document';

    case 'application/vnd.ms-excel':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return 'Microsoft Office Excel document';

    case 'application/vnd.ms-powerpoint':
      return 'Microsoft Office Power Point document';

    case 'text/rtf':
      return 'Rich Text Format';

    case 'application/pdf':
      return 'PDF';

    case 'text/plain':
      return 'Plain text';

    default:
      return type;
  }
};
