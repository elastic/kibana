/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

const INDETERMINATE_FIELD_PLACEHOLDER = '?';
const FRACTIONAL_SECOND_SEPARATORS = ':.,';

const VALID_LETTER_GROUPS = {
  'yyyy': true,
  'yy': true,
  'M': true,
  'MM': true,
  // The simple regex here is based on the fact that the %{MONTH} Grok pattern only matches English and German month names
  'MMM': true,
  'MMMM': true,
  'd': true,
  'dd': true,
  // The simple regex here is based on the fact that the %{DAY} Grok pattern only matches English and German day names
  'EEE': true,
  'EEEE': true,
  'H': true,
  'HH': true,
  'h': true,
  'mm': true,
  'ss': true,
  'a': true,
  'XX': true,
  'XXX': true,
  'zzz': true,
};
// TODO: ensure this is the best way to do this check
function isLetter(str) {
  return str.length === 1 && str.match(/[a-z]/i);
}

export function isTimestampFormatValid(timestampFormat) {
  const result = { isValid: true, errorMessage: null };

  if (timestampFormat.indexOf('\n') >= 0 || timestampFormat.indexOf('\r') >= 0) {
    result.isValid = false;
    result.errorMessage = i18n.translate('xpack.ml.fileDatavisualizer.editFlyout.overrides.customTimestampValidationErrorMessage', {
      defaultMessage: 'Multi-line timestamp formats {timestampFormat} not supported',
      values: {
        timestampFormat,
      }
    });
    return result;
  }

  if (timestampFormat.indexOf(INDETERMINATE_FIELD_PLACEHOLDER) >= 0) {
    result.isValid = false;
    result.errorMessage = i18n.translate('xpack.ml.fileDatavisualizer.editFlyout.overrides.customTimestampValidationErrorMessage', {
      defaultMessage: 'Timestamp format {timestampFormat} not supported because it contains {fieldPlaceholder}',
      values: {
        timestampFormat,
        fieldPlaceholder: INDETERMINATE_FIELD_PLACEHOLDER,
      }
    });
    return result;
  }

  let notQuoted = true;
  let prevChar = null;
  let prevLetterGroup = null;
  let pos = 0;

  while (pos < timestampFormat.length) {
    const curChar = timestampFormat.charAt(pos);

    if (curChar === '\'') {
      notQuoted = !notQuoted;
    } else if (notQuoted && isLetter(curChar)) {
      const startPos = pos;
      let endPos = startPos + 1;
      while (endPos < timestampFormat.length && timestampFormat.charAt(endPos) === curChar) {
        ++endPos;
        ++pos;
      }

      const letterGroup = timestampFormat.substring(startPos, endPos);

      if (VALID_LETTER_GROUPS[letterGroup] !== true) {
        // Special case of fractional seconds
        if (curChar !== 'S' || FRACTIONAL_SECOND_SEPARATORS.indexOf(prevChar) === -1 ||
          !('ss' === prevLetterGroup) || endPos - startPos > 9) {
          let msg = 'Letter group {letterGroup} in {timestampFormat} is not supported';
          if (curChar === 'S') {
            msg += ' because it is not preceeded by [ss] and a separator from {separators}';
          }

          const values = {
            timestampFormat,
            letterGroup
          };

          if (msg.indexOf('separator') !== -1) {
            values.separators = FRACTIONAL_SECOND_SEPARATORS;
          }

          result.isValid = false;
          result.errorMessage = i18n.translate('xpack.ml.fileDatavisualizer.editFlyout.overrides.customTimestampValidationErrorMessage', {
            defaultMessage: msg,
            values,
          });

          return result;
        }
      }
      prevLetterGroup = letterGroup;
    }

    prevChar = curChar;
    ++pos;
  }

  if (prevLetterGroup == null) {
    result.isValid = false;
    result.errorMessage = i18n.translate('xpack.ml.fileDatavisualizer.editFlyout.overrides.customTimestampValidationErrorMessage', {
      defaultMessage: 'No time format letter groups in override format {timestampFormat}',
      values: {
        timestampFormat,
      }
    });
  }

  return result;
}
