/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { useCallback, useMemo } from 'react';
import { useLicense } from '../../../../../common/hooks/use_license';
import { SourcererScopeName } from '../../../../../common/store/sourcerer/model';
import { useSourcererDataView } from '../../../../../common/containers/sourcerer';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { defaultHeaders } from '../../body/column_headers/default_headers';
import { requiredFieldsForActions } from '../../../../../detections/components/alerts_table/default_config';
import { getDefaultControlColumn } from '../../body/control_columns';
import { HeaderActions } from '../../../../../common/components/header_actions/header_actions';
import { defaultUdtHeaders } from '../../unified_components/default_headers';
import type { ColumnHeaderOptions } from '../../../../../../common/types';
import { memoizedGetTimelineColumnHeaders } from './utils';

export const useTimelineColumns = (columns: ColumnHeaderOptions[]) => {
  const { browserFields } = useSourcererDataView(SourcererScopeName.timeline);

  const unifiedComponentsInTimelineEnabled = useIsExperimentalFeatureEnabled(
    'unifiedComponentsInTimelineEnabled'
  );

  const isEnterprisePlus = useLicense().isEnterprise();
  const ACTION_BUTTON_COUNT = isEnterprisePlus ? 6 : 5;

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

  const getTimelineQueryFieldsFromColumns = useCallback(() => {
    const columnFields = augmentedColumnHeaders.map((c) => c.id);

    return [...columnFields, ...requiredFieldsForActions];
  }, [augmentedColumnHeaders]);

  const leadingControlColumns = useMemo(
    () =>
      getDefaultControlColumn(ACTION_BUTTON_COUNT).map((x) => ({
        ...x,
        headerCellRender: HeaderActions,
      })),
    [ACTION_BUTTON_COUNT]
  );

  return useMemo(
    () => ({
      defaultColumns,
      localColumns,
      augmentedColumnHeaders,
      getTimelineQueryFieldsFromColumns,
      leadingControlColumns,
    }),
    [
      augmentedColumnHeaders,
      defaultColumns,
      getTimelineQueryFieldsFromColumns,
      leadingControlColumns,
      localColumns,
    ]
  );
};
