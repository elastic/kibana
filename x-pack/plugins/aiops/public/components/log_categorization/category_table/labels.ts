/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export function getLabels(isFlyout: boolean) {
  const flyoutFilterIn = (single: boolean) =>
    i18n.translate('xpack.aiops.logCategorization.flyout.filterIn', {
      defaultMessage: 'Filter for {values, plural, one {pattern} other {patterns}}',
      values: {
        values: single ? 1 : 2,
      },
    });
  const flyoutFilterOut = (single: boolean) =>
    i18n.translate('xpack.aiops.logCategorization.flyout.filterOut', {
      defaultMessage: 'Filter out {values, plural, one {pattern} other {patterns}}',
      values: {
        values: single ? 1 : 2,
      },
    });

  const aiopsFilterIn = (single: boolean) =>
    i18n.translate('xpack.aiops.logCategorization.filterIn', {
      defaultMessage: 'Filter for {values, plural, one {pattern} other {patterns}} in Discover',
      values: {
        values: single ? 1 : 2,
      },
    });
  const aiopsFilterOut = (single: boolean) =>
    i18n.translate('xpack.aiops.logCategorization.filterOut', {
      defaultMessage: 'Filter out {values, plural, one {pattern} other {patterns}} in Discover',
      values: {
        values: single ? 1 : 2,
      },
    });

  return isFlyout
    ? {
        multiSelect: {
          in: flyoutFilterIn(false),
          out: flyoutFilterOut(false),
        },
        singleSelect: {
          in: flyoutFilterIn(true),
          out: flyoutFilterOut(true),
        },
      }
    : {
        multiSelect: {
          in: aiopsFilterIn(false),
          out: aiopsFilterOut(false),
        },
        singleSelect: {
          in: aiopsFilterIn(true),
          out: aiopsFilterOut(true),
        },
      };
}
