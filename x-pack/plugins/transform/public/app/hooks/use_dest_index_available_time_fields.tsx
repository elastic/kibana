/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';

import type { PostTransformsPreviewRequestSchema } from '../../../common/api_schemas/transforms';
import { getErrorMessage } from '../../../common/utils/errors';

import { ToastNotificationText } from '../components';
import { useToastNotifications } from '../app_dependencies';

import { useGetTransformsPreview } from './use_get_transforms_preview';
import { useAppDependencies } from '../app_dependencies';

export const useDestIndexAvailableTimeFields = (
  previewRequest: PostTransformsPreviewRequestSchema
) => {
  const { i18n: i18nStart, theme } = useAppDependencies();
  const toastNotifications = useToastNotifications();

  const { error: transformsPreviewError, data: transformPreview } = useGetTransformsPreview(
    previewRequest,
    previewRequest !== undefined
  );

  const destIndexAvailableTimeFields = useMemo<string[] | undefined>(() => {
    if (!transformPreview) return;
    const properties = transformPreview.generated_dest_index.mappings.properties;
    const timeFields: string[] = Object.keys(properties).filter(
      (col) => properties[col].type === 'date'
    );
    return timeFields;
  }, [transformPreview]);

  useEffect(() => {
    if (transformsPreviewError !== null) {
      toastNotifications.addDanger({
        title: i18n.translate('xpack.transform.stepDetailsForm.errorGettingTransformPreview', {
          defaultMessage: 'An error occurred fetching the transform preview',
        }),
        text: toMountPoint(
          <ToastNotificationText text={getErrorMessage(transformsPreviewError)} />,
          { theme, i18n: i18nStart }
        ),
      });
    }
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transformsPreviewError]);

  return destIndexAvailableTimeFields;
};
