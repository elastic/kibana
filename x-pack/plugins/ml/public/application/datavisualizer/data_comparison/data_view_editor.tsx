/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useDebounce from 'react-use/lib/useDebounce';
import useObservable from 'react-use/lib/useObservable';
import React, { ChangeEvent, ReactNode, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBasicTable, EuiFieldText, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import type { DataViewEditorStart } from '@kbn/data-view-editor-plugin/public';
import type { TimestampOption } from '@kbn/data-view-editor-plugin/public/types';
import type { MatchedItem } from '@kbn/data-views-plugin/public';
import { useTableSettings } from '../../data_frame_analytics/pages/analytics_management/components/analytics_list/use_table_settings';
import { canAppendWildcard, matchedIndiciesDefault } from './data_drift_index_patterns_editor';

interface DataViewEditorProps {
  label: ReactNode;
  dataViewEditorService: ReturnType<DataViewEditorStart['dataViewEditorServiceFactory']>;
  indexPattern: string;
  setIndexPattern: (ip: string) => void;
}

export function DataViewEditor({
  label,
  dataViewEditorService,
  indexPattern,
  setIndexPattern,
}: DataViewEditorProps) {
  useDebounce(
    () => {
      dataViewEditorService.setIndexPattern(indexPattern);
    },
    250,
    [indexPattern]
  );
  const matchedIndices = useObservable(
    dataViewEditorService.matchedIndices$,
    matchedIndiciesDefault
  );
  const options = useObservable<TimestampOption[]>(
    dataViewEditorService.timestampFieldOptions$,
    []
  );
  const isLoadingOptions = useObservable<boolean>(
    dataViewEditorService.loadingTimestampFields$,
    false
  );

  const matchedReferenceIndices =
    indexPattern === '' ? matchedIndices.allIndices : matchedIndices.exactMatchedIndices;
  const [appendedWildcard, setAppendedWildcard] = useState<boolean>(false);

  const [pageState, updatePageState] = useState({
    pageIndex: 0,
    pageSize: 10,
    sortField: 'name',
    sortDirection: 'asc',
  });

  const { onTableChange, pagination } = useTableSettings<MatchedItem>(
    matchedReferenceIndices.length,
    pageState,
    // @ts-expect-error callback will have all the 4 necessary params
    updatePageState
  );

  const pageOfItems = useMemo(() => {
    return matchedReferenceIndices.slice(
      pagination.pageIndex * pagination.pageSize,
      (pagination.pageIndex + 1) * pagination.pageSize
    );
  }, [pagination.pageSize, pagination.pageIndex, matchedReferenceIndices]);

  const columns = [
    {
      field: 'name',
      name: i18n.translate('xpack.ml.dataDrift.indexPatternsEditor.tableColShard', {
        defaultMessage: 'Matched indices',
      }),
      sortable: false,
      truncateText: false,
    },
  ];
  const errorMessage = useMemo(() => {
    if (indexPattern === '')
      return i18n.translate('xpack.ml.dataDrift.indexPatternsEditor.error.noEmptyIndexPattern', {
        defaultMessage: 'Index pattern must not be empty.',
      });

    if (isLoadingOptions === false && options.length === 0)
      return i18n.translate('xpack.ml.dataDrift.indexPatternsEditor.error.noEmptyIndexPattern', {
        defaultMessage: 'No matching data stream, index, or index alias has a timestamp field.',
      });
    return undefined;
  }, [indexPattern, isLoadingOptions, options.length]);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <EuiFormRow
          label={label}
          error={errorMessage}
          isInvalid={errorMessage !== undefined}
          fullWidth
        >
          <EuiFieldText
            value={indexPattern}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              let query = e.target.value;
              if (query.length === 1 && !appendedWildcard && canAppendWildcard(query)) {
                query += '*';
                setAppendedWildcard(true);
                setTimeout(() => e.target.setSelectionRange(1, 1));
              } else {
                if (['', '*'].includes(query) && appendedWildcard) {
                  query = '';
                  setAppendedWildcard(false);
                }
              }
              setIndexPattern(query);
            }}
            fullWidth
            data-test-subj="createIndexPatternTitleInput"
            placeholder="example-pattern*"
          />
        </EuiFormRow>

        <EuiBasicTable<MatchedItem>
          items={pageOfItems}
          columns={columns}
          pagination={pagination}
          onChange={onTableChange}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
