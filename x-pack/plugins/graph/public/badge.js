/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export function getReadonlyBadge(uiCapabilities) {
  if (uiCapabilities.graph.save) {
    return null;
  }

  return {
    text: i18n.translate('xpack.graph.badge.readOnly.text', {
      defaultMessage: 'Read only',
    }),
    tooltip: i18n.translate('xpack.graph.badge.readOnly.tooltip', {
      defaultMessage: 'Unable to save Graph workspaces',
    }),
    iconType: 'glasses',
  };
}
