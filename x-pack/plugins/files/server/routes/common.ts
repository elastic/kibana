/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import mime from 'mime';
import type { ResponseHeaders } from '@kbn/core/server';
import type { File } from '../../common/types';

/**
 * Generate download headers for a {@link File} object.
 *
 * @param file the {@link File} object to get headers for
 * @param fileName an optional override for the file name
 */
export function getDownloadHeadersForFile(file: File, fileName?: string): ResponseHeaders {
  return {
    'content-type':
      (fileName && mime.getType(fileName)) ?? file.data.mimeType ?? 'application/octet-stream',
    // Note, this name can be overridden by the client if set via a "download" attribute on the HTML tag.
    'content-disposition': `attachment; filename="${fileName || getDownloadNameForFile(file)}"`,
    'cache-control': 'max-age=31536000, immutable',
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
    'x-content-type-options': 'nosniff',
  };
}

/**
 * Try to generate a nice, download-friendly name for a file.
 *
 * E.g., my_image.png.
 *
 * @param file the {@link File} object to get a name for
 */
export function getDownloadNameForFile(file: File): string {
  // When creating a file we also calculate the extension so the `file.extension`
  // check is not really necessary except for type checking.
  if (file.data.mimeType && file.data.extension) {
    return `${file.data.name}.${file.data.extension}`;
  }
  return file.data.name;
}
