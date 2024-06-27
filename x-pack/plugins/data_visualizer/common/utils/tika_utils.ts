/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TIKA_MIME_TYPES = [
  'application/doc',
  'application/ms-doc',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

  'application/excel',
  'application/vnd.ms-excel',
  'application/x-excel',
  'application/x-msexcel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  'application/mspowerpoint',
  'application/powerpoint',
  'application/vnd.ms-powerpoint',
  'application/x-mspowerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  'application/vnd.oasis.opendocument.presentation',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.text',

  'text/rtf',

  'application/pdf',

  'text/plain',
];

export function isTikaType(type: string) {
  return TIKA_MIME_TYPES.includes(type);
}

export const getTikaDisplayType = (type: string) => {
  switch (type) {
    case 'application/doc':
    case 'application/ms-doc':
    case 'application/msword':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'Microsoft Office Word document';

    case 'application/excel':
    case 'application/vnd.ms-excel':
    case 'application/x-excel':
    case 'application/x-msexcel':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return 'Microsoft Office Excel document';

    case 'application/mspowerpoint':
    case 'application/powerpoint':
    case 'application/vnd.ms-powerpoint':
    case 'application/x-mspowerpoint':
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return 'Microsoft Office Power Point document';

    case 'application/vnd.oasis.opendocument.presentation':
    case 'application/vnd.oasis.opendocument.spreadsheet':
    case 'application/vnd.oasis.opendocument.text':
      return 'Open Document Format';

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
