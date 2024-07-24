/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function isTikaType(type: string) {
  return getTikaDisplayType(type).isTikaType;
}

export const getTikaDisplayType = (type: string): { isTikaType: boolean; type: string } => {
  switch (type) {
    case 'application/doc':
    case 'application/ms-doc':
    case 'application/msword':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return { isTikaType: true, type: 'Microsoft Office Word document' };

    case 'application/excel':
    case 'application/vnd.ms-excel':
    case 'application/x-excel':
    case 'application/x-msexcel':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return { isTikaType: true, type: 'Microsoft Office Excel document' };

    case 'application/mspowerpoint':
    case 'application/powerpoint':
    case 'application/vnd.ms-powerpoint':
    case 'application/x-mspowerpoint':
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return { isTikaType: true, type: 'Microsoft Office Power Point document' };

    case 'application/vnd.oasis.opendocument.presentation':
    case 'application/vnd.oasis.opendocument.spreadsheet':
    case 'application/vnd.oasis.opendocument.text':
      return { isTikaType: true, type: 'Open Document Format' };

    case 'text/rtf':
    case 'application/rtf':
      return { isTikaType: true, type: 'Rich Text Format' };

    case 'application/pdf':
      return { isTikaType: true, type: 'PDF' };

    case 'text/plain':
    case 'text/plain; charset=UTF-8':
      return { isTikaType: true, type: 'Plain text' };

    default:
      return { isTikaType: false, type };
  }
};
