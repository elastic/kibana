/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import dateMath from '@kbn/datemath';
import { i18n } from '@kbn/i18n';
export const INTERVAL_STRING_RE = new RegExp(`^([\\d\\.]+)\\s*(${dateMath.units.join('|')})$`);

export const parseInterval = (intervalString: string) => {
  if (intervalString) {
    const matches = intervalString.match(INTERVAL_STRING_RE);
    if (matches) {
      const value = Number(matches[1]);
      const unit = matches[2];
      return { value, unit };
    }
  }
  throw new Error(
    i18n.translate('xpack.triggersActionsUI.parseInterval.errorMessage', {
      defaultMessage: '{value} is not an interval string',
      values: {
        value: intervalString,
      },
    })
  );
};
