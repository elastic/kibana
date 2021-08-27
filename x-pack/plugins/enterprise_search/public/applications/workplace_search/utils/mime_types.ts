/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomAPIFieldValue } from '../types';

const mimeTypes = {
  'application/iwork-keynote-sffkey': 'Keynote',
  'application/x-iwork-keynote-sffkey': 'Keynote',
  'application/iwork-numbers-sffnumbers': 'Numbers',
  'application/iwork-pages-sffpages': 'Pages',
  'application/json': 'JSON',
  'application/mp4': 'MP4',
  'application/msword': 'DOC',
  'application/octet-stream': 'Binary',
  'application/pdf': 'PDF',
  'application/rtf': 'RTF',
  'application/vnd.google-apps.audio': 'Google Audio',
  'application/vnd.google-apps.document': 'Google Doc',
  'application/vnd.google-apps.drawing': 'Google Drawing',
  'application/vnd.google-apps.file': 'Google Drive File',
  'application/vnd.google-apps.folder': 'Google Drive Folder',
  'application/vnd.google-apps.form': 'Google Form',
  'application/vnd.google-apps.fusiontable': 'Google Fusion Table',
  'application/vnd.google-apps.map': 'Google Map',
  'application/vnd.google-apps.photo': 'Google Photo',
  'application/vnd.google-apps.presentation': 'Google Slides',
  'application/vnd.google-apps.script': 'Google Script',
  'application/vnd.google-apps.sites': 'Google Site',
  'application/vnd.google-apps.spreadsheet': 'Google Sheet',
  'application/vnd.google-apps.unknown': 'Google Unknown',
  'application/vnd.google-apps.video': 'Google Video',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/xml': 'XML',
  'application/zip': 'ZIP',
  'image/gif': 'GIF',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/svg+xml': 'SVG',
  'image/tiff': 'TIFF',
  'image/vnd.adobe.photoshop': 'PSD',
  'text/comma-separated-values': 'CSV',
  'text/css': 'CSS',
  'text/html': 'HTML',
  'text/plain': 'TXT',
  'video/quicktime': 'MOV',
} as { [key: string]: string };

export const mimeType = (type: CustomAPIFieldValue) =>
  mimeTypes[type.toString().toLowerCase()] || type;
