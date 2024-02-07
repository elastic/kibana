/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { getSyntheticsAssetsChecks, selectSyntheticsEnablement } from '../state';

export function useSyntheticsAssetsCheck() {
  const dispatch = useDispatch();

  const { notifications } = useKibana().services;

  const { assetCheckResult, assetCheckLoading } = useSelector(selectSyntheticsEnablement);

  useEffect(() => {
    if (!assetCheckResult && !assetCheckLoading) {
      dispatch(getSyntheticsAssetsChecks.get());
    }
    if (assetCheckResult) {
      const { hasAllAssets, error } = assetCheckResult;
      if (!hasAllAssets) {
        notifications?.toasts.addWarning({
          title: error,
          text: i18n.translate('xpack.synthetics.assetsCheck.missingAssetsWarning', {
            defaultMessage:
              'Synthetics integration is missing some assets. Please try reinstalling it. If the problem persists, contact support.',
          }),
        });
      }
    }
  }, [dispatch, assetCheckResult, assetCheckLoading, notifications]);

  return assetCheckResult;
}
