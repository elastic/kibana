/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  INDEX_CLEARING_CACHE,
  INDEX_CLOSED,
  INDEX_CLOSING,
  INDEX_MERGING,
  INDEX_OPENING,
  INDEX_REFRESHING,
  INDEX_FLUSHING,
  INDEX_FORCEMERGING,
} from '../../../common/constants';

export const indexStatusLabels = {
  [INDEX_CLEARING_CACHE]: i18n.translate(
    'xpack.idxMgmt.indexStatusLabels.clearingCacheStatusLabel',
    {
      defaultMessage: 'clearing cache...',
    }
  ),
  [INDEX_CLOSED]: i18n.translate('xpack.idxMgmt.indexStatusLabels.closedStatusLabel', {
    defaultMessage: 'closed',
  }),
  [INDEX_CLOSING]: i18n.translate('xpack.idxMgmt.indexStatusLabels.closingStatusLabel', {
    defaultMessage: 'closing...',
  }),
  [INDEX_MERGING]: i18n.translate('xpack.idxMgmt.indexStatusLabels.mergingStatusLabel', {
    defaultMessage: 'merging...',
  }),
  [INDEX_OPENING]: i18n.translate('xpack.idxMgmt.indexStatusLabels.openingStatusLabel', {
    defaultMessage: 'opening...',
  }),
  [INDEX_REFRESHING]: i18n.translate('xpack.idxMgmt.indexStatusLabels.refreshingStatusLabel', {
    defaultMessage: 'refreshing...',
  }),
  [INDEX_FLUSHING]: i18n.translate('xpack.idxMgmt.indexStatusLabels.flushingStatusLabel', {
    defaultMessage: 'flushing...',
  }),
  [INDEX_FORCEMERGING]: i18n.translate('xpack.idxMgmt.indexStatusLabels.forcingMergeStatusLabel', {
    defaultMessage: 'forcing merge...',
  }),
};
