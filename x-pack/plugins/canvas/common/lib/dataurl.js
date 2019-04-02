/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromByteArray } from 'base64-js';
import mime from 'mime/lite';

const dataurlRegex = /^data:([a-z]+\/[a-z0-9-+.]+)(;[a-z-]+=[a-z0-9-]+)?(;([a-z0-9]+))?,/;

export const imageTypes = ['image/svg+xml', 'image/jpeg', 'image/png', 'image/gif'];

export function parseDataUrl(str, withData = false) {
  if (typeof str !== 'string') {
    return;
  }

  const matches = str.match(dataurlRegex);

  if (!matches) {
    return;
  }

  const [, mimetype, charset, , encoding] = matches;

  // all types except for svg need to be base64 encoded
  const imageTypeIndex = imageTypes.indexOf(matches[1]);
  if (imageTypeIndex > 0 && encoding !== 'base64') {
    return;
  }

  return {
    mimetype,
    encoding,
    charset: charset && charset.split('=')[1],
    data: !withData ? null : str.split(',')[1],
    isImage: imageTypeIndex >= 0,
    extension: mime.getExtension(mimetype),
  };
}

export function isValidDataUrl(str) {
  return dataurlRegex.test(str);
}

export function encode(data, type = 'text/plain') {
  // use FileReader if it's available, like in the browser
  if (FileReader) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = err => reject(err);
      reader.readAsDataURL(data);
    });
  }

  // otherwise fall back to fromByteArray
  // note: Buffer doesn't seem to correctly base64 encode binary data
  return Promise.resolve(`data:${type};base64,${fromByteArray(data)}`);
}
