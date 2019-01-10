/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import Joi from 'joi';
import { INDEX_ILLEGAL_CHARACTERS_VISIBLE } from 'ui/indices';

export const i18nValidationErrorMessages = {
  'any.empty': ({ label }) => (
    i18n.translate('xpack.crossClusterReplication.formInputValidation.errorEmpty', {
      defaultMessage: `'{label}' is required.`,
      values: { label }
    })
  ),
  'number.base': ({ label }) => (
    i18n.translate('xpack.crossClusterReplication.formInputValidation.notNumberError', {
      defaultMessage: `'{label}' must be a number.`,
      values: { label }
    })
  ),
  'string.firstChar': ({ label, char }) => (
    <FormattedMessage
      id="xpack.crossClusterReplication.formInputValidation.indexNameValidation.errorFirstChar"
      defaultMessage="'{label}' can't begin with a '{char}'."
      values={{
        label,
        char: <strong>{char}</strong>
      }}
    />
  ),
  'string.illegalChars': ({ label, chars }) => (
    <FormattedMessage
      id="xpack.crossClusterReplication.formInputValidation.indexNameValidation.illegalCharacters"
      defaultMessage="'{label}' can't contain the following character(s): {chars}."
      values={{
        label,
        chars: <strong>{chars}</strong>
      }}
    />
  )
};

const findCharactersInString = (string, chars) => (
  chars.reduce((chars, char) => {
    if (string.includes(char)) {
      chars.push(char);
    }

    return chars;
  }, [])
);

const advancedStringValidation = (joi) => ({
  base: joi.string(),
  name: 'extendedString',
  language: {
    firstCharNotAllowed: `can't begin with a period.`,
    illegalChars: `can't contain the following character(s): {{illegalChars}}.`,
  },
  rules: [
    {
      name: 'firstCharNotAllowed',
      params: {
        char: joi.string().required()
      },
      validate({ char }, value, state, options) {
        if (value[0] === char) {
          return this.createError('string.firstChar', { v: value, char }, state, options);
        }

        return value; // Everything is OK
      }
    },
    {
      name: 'illegalChars',
      params: {
        chars: joi.array().items(joi.string()).required()
      },
      validate({ chars }, value, state, options) {
        const illegalCharacters = findCharactersInString(value, chars);
        if (illegalCharacters.length) {
          return this.createError('string.illegalChars', { v: value, chars: illegalCharacters.join(' ') }, state, options);
        }

        return value; // Everything is OK
      }
    }
  ]
});

export const customJoi = Joi.extend(advancedStringValidation); // Add extendsion for advanced string validations

export const indexNameValidator = customJoi.extendedString().firstCharNotAllowed('.').illegalChars(INDEX_ILLEGAL_CHARACTERS_VISIBLE);
