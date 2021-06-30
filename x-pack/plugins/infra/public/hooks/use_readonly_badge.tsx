/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';

export const useReadOnlyBadge = (isReadOnly = false) => {
  const chrome = useKibana().services.chrome;
  const badge = useMemo(() => {
    return isReadOnly
      ? {
          text: i18n.translate('xpack.infra.header.badge.readOnly.text', {
            defaultMessage: 'Read only',
          }),
          tooltip: i18n.translate('xpack.infra.header.badge.readOnly.tooltip', {
            defaultMessage: 'Unable to change source configuration',
          }),
          iconType: 'glasses',
        }
      : undefined;
  }, [isReadOnly]);

  const setBadge = useCallback(() => {
    return chrome?.setBadge(badge);
  }, [badge, chrome]);

  useEffect(() => {
    setBadge();
  }, [badge, setBadge]);

  return null;
};
