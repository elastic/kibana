/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { useEffect } from 'react';
import { capabilities } from 'ui/capabilities';
import chrome from 'ui/chrome';

export const useUpdateBadgeEffect = () => {
  useEffect(() => {
    const uiCapabilities = capabilities.get();
    chrome.badge.set(
      !uiCapabilities.apm.save
        ? {
            text: i18n.translate('xpack.apm.header.badge.readOnly.text', {
              defaultMessage: 'Read only'
            }),
            tooltip: i18n.translate('xpack.apm.header.badge.readOnly.tooltip', {
              defaultMessage: 'Unable to save'
            }),
            iconType: 'glasses'
          }
        : undefined
    );
  }, []);
};
