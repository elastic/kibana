/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { useMemo } from 'react';
import { SourcererScopeName } from '../../../../../sourcerer/store/model';
import { useSourcererDataView } from '../../../../../sourcerer/containers';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { defaultHeaders } from '../../body/column_headers/default_headers';
import { requiredFieldsForActions } from '../../../../../detections/components/alerts_table/default_config';
import { defaultUdtHeaders } from '../../unified_components/default_headers';
import type { ColumnHeaderOptions } from '../../../../../../common/types';
import { memoizedGetTimelineColumnHeaders } from './utils';

export const useTimelineColumns = (columns: ColumnHeaderOptions[]) => {
  const { browserFields } = useSourcererDataView(SourcererScopeName.timeline);

  const unifiedComponentsInTimelineEnabled = useIsExperimentalFeatureEnabled(
    'unifiedComponentsInTimelineEnabled'
  );

  const defaultColumns = useMemo(
    () => (unifiedComponentsInTimelineEnabled ? defaultUdtHeaders : defaultHeaders),
    [unifiedComponentsInTimelineEnabled]
  );

  const localColumns = useMemo(
    () => (isEmpty(columns) ? defaultColumns : columns),
    [columns, defaultColumns]
  );

  const augmentedColumnHeaders = memoizedGetTimelineColumnHeaders(
    localColumns,
    browserFields,
    false
  );

  const timelineQueryFieldsFromColumns = useMemo(() => {
    const columnFields = augmentedColumnHeaders.map((c) => c.id);

    return [...columnFields, ...requiredFieldsForActions];
  }, [augmentedColumnHeaders]);

  return useMemo(
    () => ({
      defaultColumns,
      localColumns,
      augmentedColumnHeaders,
      timelineQueryFieldsFromColumns,
    }),
    [augmentedColumnHeaders, defaultColumns, timelineQueryFieldsFromColumns, localColumns]
  );
};
