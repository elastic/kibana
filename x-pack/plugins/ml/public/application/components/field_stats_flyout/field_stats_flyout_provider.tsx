/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, type FC } from 'react';
import type { DataView } from '@kbn/data-plugin/common';
import type { FieldStatsServices } from '@kbn/unified-field-list/src/components/field_stats';
import type { TimeRange as TimeRangeMs } from '@kbn/ml-date-picker';
import type { FieldStatsProps } from '@kbn/unified-field-list/src/components/field_stats';
import { useEffect } from 'react';
import { getProcessedFields } from '@kbn/ml-data-grid';
import { stringHash } from '@kbn/ml-string-hash';
import { lastValueFrom } from 'rxjs';
import { useRef } from 'react';
import { getMergedSampleDocsForPopulatedFieldsQuery } from './populated_fields/get_merged_populated_fields_query';
import { useMlKibana } from '../../contexts/kibana';
import { FieldStatsFlyout } from './field_stats_flyout';
import { MLFieldStatsFlyoutContext } from './use_field_stats_flytout_context';
import { PopulatedFieldsCacheManager } from './populated_fields/populated_fields_cache_manager';

export const FieldStatsFlyoutProvider: FC<{
  dataView: DataView;
  fieldStatsServices: FieldStatsServices;
  timeRangeMs?: TimeRangeMs;
  dslQuery?: FieldStatsProps['dslQuery'];
  disablePopulatedFields?: boolean;
}> = ({
  dataView,
  fieldStatsServices,
  timeRangeMs,
  dslQuery,
  disablePopulatedFields = false,
  children,
}) => {
  const {
    services: {
      data: { search },
    },
  } = useMlKibana();
  const [isFieldStatsFlyoutVisible, setFieldStatsIsFlyoutVisible] = useState(false);
  const [fieldName, setFieldName] = useState<string | undefined>();
  const [fieldValue, setFieldValue] = useState<string | number | undefined>();

  const toggleFieldStatsFlyoutVisible = useCallback(
    () => setFieldStatsIsFlyoutVisible(!isFieldStatsFlyoutVisible),
    [isFieldStatsFlyoutVisible]
  );
  const [manager] = useState(new PopulatedFieldsCacheManager());
  const [populatedFields, setPopulatedFields] = useState<Set<string> | undefined>();
  const abortController = useRef(new AbortController());

  useEffect(
    function fetchSampleDocsEffect() {
      if (disablePopulatedFields) return;

      let unmounted = false;

      if (abortController.current) {
        abortController.current.abort();
        abortController.current = new AbortController();
      }

      const queryAndRunTimeMappings = getMergedSampleDocsForPopulatedFieldsQuery({
        searchQuery: dslQuery,
        runtimeFields: dataView.getRuntimeMappings(),
        datetimeField: dataView.getTimeField()?.name,
        timeRange: timeRangeMs,
      });
      const indexPattern = dataView.getIndexPattern();
      const esSearchRequestParams = {
        index: indexPattern,
        body: {
          fields: ['*'],
          _source: false,
          ...queryAndRunTimeMappings,
          size: 500,
        },
      };
      const cacheKey = stringHash(JSON.stringify(esSearchRequestParams)).toString();

      const fetchSampleDocuments = async function () {
        try {
          const resp = await lastValueFrom(
            search.search(
              {
                params: esSearchRequestParams,
              },
              { abortSignal: abortController.current.signal }
            )
          );

          const docs = resp.rawResponse.hits.hits.map((d) => getProcessedFields(d.fields ?? {}));

          // Get all field names for each returned doc and flatten it
          // to a list of unique field names used across all docs.
          const fieldsWithData = new Set(docs.map(Object.keys).flat(1));
          manager.set(cacheKey, fieldsWithData);
          if (!unmounted) {
            setPopulatedFields(fieldsWithData);
          }
        } catch (e) {
          if (e.name !== 'AbortError') {
            // eslint-disable-next-line no-console
            console.error(
              `An error occurred fetching sample documents to determine populated field stats.
          \nQuery:\n${JSON.stringify(esSearchRequestParams)}
          \nError:${e}`
            );
          }
        }
      };

      const cachedResult = manager.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      } else {
        fetchSampleDocuments();
      }

      return () => {
        unmounted = true;
        abortController.current.abort();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify({ dslQuery, dataViewId: dataView.id, timeRangeMs })]
  );

  return (
    <MLFieldStatsFlyoutContext.Provider
      value={{
        isFlyoutVisible: isFieldStatsFlyoutVisible,
        setIsFlyoutVisible: setFieldStatsIsFlyoutVisible,
        toggleFlyoutVisible: toggleFieldStatsFlyoutVisible,
        setFieldName,
        fieldName,
        setFieldValue,
        fieldValue,
        timeRangeMs,
        populatedFields,
      }}
    >
      <FieldStatsFlyout
        dataView={dataView}
        fieldStatsServices={fieldStatsServices}
        timeRangeMs={timeRangeMs}
        dslQuery={dslQuery}
      />
      {children}
    </MLFieldStatsFlyoutContext.Provider>
  );
};
