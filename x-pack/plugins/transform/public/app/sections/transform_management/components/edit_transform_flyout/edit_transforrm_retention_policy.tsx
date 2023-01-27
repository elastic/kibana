/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';

import { KBN_FIELD_TYPES } from '@kbn/field-types';

import { useAppDependencies } from '../../../../app_dependencies';

import { useEditTransformFlyoutState } from './use_edit_transform_flyout';

export const useRetentionPolicy = () => {
  const appDeps = useAppDependencies();
  const dataViewsClient = appDeps.data.dataViews;

  const { dataViewId } = useEditTransformFlyoutState();

  const [dateFieldNames, setDateFieldNames] = useState<string[]>([]);

  useEffect(
    function getDateFields() {
      let unmounted = false;
      if (dataViewId !== undefined) {
        dataViewsClient.get(dataViewId).then((dataView) => {
          if (dataView) {
            const dateTimeFields = dataView.fields
              .filter((f) => f.type === KBN_FIELD_TYPES.DATE)
              .map((f) => f.name)
              .sort();
            if (!unmounted) {
              setDateFieldNames(dateTimeFields);
            }
          }
        });
        return () => {
          unmounted = true;
        };
      }
    },
    [dataViewId, dataViewsClient]
  );

  const isRetentionPolicyAvailable = dateFieldNames.length > 0;
  const retentionDateFieldOptions = useMemo(() => {
    return Array.isArray(dateFieldNames)
      ? dateFieldNames.map((text: string) => ({ text, value: text }))
      : [];
  }, [dateFieldNames]);

  return { isRetentionPolicyAvailable, retentionDateFieldOptions };
};
