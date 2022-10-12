/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { ValidatorServices } from '../../types';

export const urlAllowListValidator = <T>(urlKey: string) => {
  return (obj: T, validatorServices: ValidatorServices) => {
    const { configurationUtilities } = validatorServices;
    try {
      const url = get(obj, urlKey, '');

      configurationUtilities.ensureUriAllowed(url);
    } catch (allowListError) {
      throw new Error(
        i18n.translate('xpack.actions.subActionsFramework.urlValidationError', {
          defaultMessage: 'error validating url: {message}',
          values: {
            message: allowListError.message,
          },
        })
      );
    }
  };
};
