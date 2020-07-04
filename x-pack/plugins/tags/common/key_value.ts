/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface TagKeyValue {
  key: string;
  value: string;
}

/**
 * Tag title can contain a colon ":", in that case we treat it as a key-value
 * tag. The text before the first colon is assumed to be the key and the rest
 * is the value. If tag is not a key-value tag (it has no colon) then the key
 * is assumed to be the whole tag and the value is empty string.
 *
 * @example
 *
 * Tag title    | Key-value
 * ------------ | ---------------------------------
 * Team:AppArch | { key: 'Team', value: 'AppArch' }
 * Production   | { key: 'Production', value: '' }
 *
 * @param title Plain text tag title as entered by user.
 * @return Object representing tag parsed into key-value.
 */
export const parseTag = (title: string): TagKeyValue => {
  const colonIndex = title.indexOf(':');

  if (colonIndex < 0)
    return {
      key: title,
      value: '',
    };

  return {
    key: title.substr(0, colonIndex).trim(),
    value: title.substr(colonIndex + 1).trim(),
  };
};
