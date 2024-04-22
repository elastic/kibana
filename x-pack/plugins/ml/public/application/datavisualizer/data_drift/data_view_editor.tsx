/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useDebounce from 'react-use/lib/useDebounce';
import useObservable from 'react-use/lib/useObservable';
import type { ChangeEvent, ReactNode } from 'react';
import React, { useMemo, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiBasicTable,
  EuiCallOut,
  EuiFieldText,
  EuiFlexItem,
  EuiFormRow,
  EuiFlexGrid,
  useEuiTheme,
} from '@elastic/eui';
import type { DataViewEditorService } from '@kbn/data-view-editor-plugin/public';
import type { MatchedItem } from '@kbn/data-views-plugin/public';
import { useTableSettings } from '../../data_frame_analytics/pages/analytics_management/components/analytics_list/use_table_settings';
import { canAppendWildcard, matchedIndicesDefault } from './data_drift_index_patterns_editor';

interface DataViewEditorProps {
  id: string;
  label: ReactNode;
  dataViewEditorService: DataViewEditorService;
  indexPattern: string;
  setIndexPattern: (ip: string) => void;
  onError: (errorMsg?: string) => void;
  helpText?: ReactNode;
}

const mustMatchError = i18n.translate(
  'xpack.ml.dataDrift.indexPatternsEditor.createIndex.noMatch',
  {
    defaultMessage: 'Name must match one or more data streams, indices, or index aliases.',
  }
);

export function DataViewEditor({
  id,
  label,
  dataViewEditorService,
  indexPattern,
  setIndexPattern,
  onError,
  helpText,
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
    matchedIndicesDefault
  );

  const matchedReferenceIndices =
    indexPattern === '' || (indexPattern !== '' && matchedIndices.exactMatchedIndices.length === 0)
      ? matchedIndices.allIndices
      : matchedIndices.exactMatchedIndices;
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
    if (indexPattern !== '' && matchedIndices.exactMatchedIndices.length === 0) {
      return mustMatchError;
    }
    return undefined;
  }, [indexPattern, matchedIndices.exactMatchedIndices.length]);

  useEffect(() => {
    if (onError) {
      onError(errorMessage);
    }
  }, [onError, errorMessage]);
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGrid columns={2} gutterSize="none">
      <EuiFlexItem
        css={{
          paddingLeft: euiTheme.size.base,
          paddingRight: euiTheme.size.base,
          borderRight: euiTheme.border.thin,
        }}
      >
        <EuiFormRow
          label={label}
          error={errorMessage}
          isInvalid={errorMessage !== undefined}
          fullWidth
          helpText={helpText}
          data-test-subj={`mlDataDriftIndexPatternFormRow-${id ?? ''}`}
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
            data-test-subj={`mlDataDriftIndexPatternTitleInput-${id ?? ''}`}
            placeholder="example-pattern*"
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem css={{ paddingLeft: euiTheme.size.base, paddingRight: euiTheme.size.base }}>
        {errorMessage === mustMatchError ? (
          <EuiCallOut color="warning">
            <FormattedMessage
              id="xpack.ml.dataDrift.indexPatternsEditor.notMatchDetail"
              defaultMessage="The index pattern you entered doesn't match any data streams, indices, or index aliases.
         You can match {strongIndices}."
              values={{
                strongIndices: (
                  <strong>
                    <FormattedMessage
                      id="xpack.ml.dataDrift.indexPatternsEditor.allIndicesLabel"
                      defaultMessage="{indicesLength, plural,
                one {# source}
                other {# sources}
              }"
                      values={{ indicesLength: matchedIndices.allIndices.length }}
                    />
                  </strong>
                ),
              }}
            />
          </EuiCallOut>
        ) : null}
        <EuiBasicTable<MatchedItem>
          items={pageOfItems}
          columns={columns}
          pagination={pagination}
          onChange={onTableChange}
          data-test-subject={`mlDataDriftIndexPatternTable-${id ?? ''}`}
          rowProps={(item) => {
            return {
              'data-test-subj': `mlDataDriftIndexPatternTableRow row-${id}`,
            };
          }}
        />
      </EuiFlexItem>
    </EuiFlexGrid>
  );
}
