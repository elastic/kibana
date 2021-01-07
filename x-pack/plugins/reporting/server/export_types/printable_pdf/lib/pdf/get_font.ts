/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore: no module definition
import xRegExp from 'xregexp';

export function getFont(text: string) {
  // Once unicode regex scripts are fully supported we should be able to get rid of the dependency
  // on xRegExp library.  See https://github.com/tc39/proposal-regexp-unicode-property-escapes
  // for more information. We are matching Han characters which is one of the supported unicode scripts
  // (you can see the full list of supported scripts here: http://www.unicode.org/standard/supported.html).
  // This will match Chinese, Japanese, Korean and some other Asian languages.
  const isCKJ = xRegExp('\\p{Han}').test(text, 'g');
  if (isCKJ) {
    return 'noto-cjk';
  } else {
    return 'Roboto';
  }
}
