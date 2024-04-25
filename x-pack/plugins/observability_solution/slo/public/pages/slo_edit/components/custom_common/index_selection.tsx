/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { DataViewPicker } from '@kbn/unified-search-plugin/public';
import { useFetchDataViews } from '@kbn/observability-plugin/public';
import { SloPublicPluginsStart } from '../../../..';
import { useKibana } from '../../../../utils/kibana_react';
import { CreateSLOForm } from '../../types';

export const DATA_VIEW_FIELD = 'indicator.params.dataViewId';
const INDEX_FIELD = 'indicator.params.index';
const TIMESTAMP_FIELD = 'indicator.params.timestampField';

export function IndexSelection({ selectedDataView }: { selectedDataView?: DataView }) {
  const { control, getFieldState, setValue, watch } = useFormContext<CreateSLOForm>();
  const { dataViews: dataViewsService, dataViewFieldEditor } = useKibana().services;

  const { isLoading: isDataViewsLoading, data: dataViews = [], refetch } = useFetchDataViews();

  const { dataViewEditor } = useKibana<SloPublicPluginsStart>().services;
  const [adHocDataViews, setAdHocDataViews] = useState<DataView[]>([]);

  const currentIndexPattern = watch(INDEX_FIELD);
  const currentDataViewId = watch(DATA_VIEW_FIELD);

  useEffect(() => {
    if (!isDataViewsLoading) {
      const missingAdHocDataView =
        dataViews.find((dataView) => dataView.title === currentIndexPattern) ||
        adHocDataViews.find((dataView) => dataView.getIndexPattern() === currentIndexPattern);

      if (!missingAdHocDataView && currentIndexPattern) {
        async function loadMissingDataView() {
          const dataView = await dataViewsService.create(
            {
              title: currentIndexPattern,
              allowNoIndex: true,
            },
            true
          );
          if (dataView.getIndexPattern() === currentIndexPattern) {
            setAdHocDataViews((prev) => [...prev, dataView]);
          }
        }

        loadMissingDataView();
      }
    }
  }, [adHocDataViews, currentIndexPattern, dataViews, dataViewsService, isDataViewsLoading]);

  const getDataViewPatternById = (id?: string) => {
    return (
      dataViews.find((dataView) => dataView.id === id)?.title ||
      adHocDataViews.find((dataView) => dataView.id === id)?.getIndexPattern()
    );
  };

  const getDataViewIdByIndexPattern = useCallback(
    (indexPattern: string) => {
      return (
        dataViews.find((dataView) => dataView.title === indexPattern) ||
        adHocDataViews.find((dataView) => dataView.getIndexPattern() === indexPattern)
      );
    },
    [adHocDataViews, dataViews]
  );

  useEffect(() => {
    if (!currentDataViewId && currentIndexPattern) {
      setValue(DATA_VIEW_FIELD, getDataViewIdByIndexPattern(currentIndexPattern)?.id);
    }
  }, [currentDataViewId, currentIndexPattern, getDataViewIdByIndexPattern, setValue]);

  return (
    <EuiFormRow label={INDEX_LABEL} isInvalid={getFieldState(INDEX_FIELD).invalid}>
      <Controller
        defaultValue=""
        name={DATA_VIEW_FIELD}
        control={control}
        rules={{ required: !Boolean(currentIndexPattern) }}
        render={({ field, fieldState }) => (
          <DataViewPicker
            adHocDataViews={adHocDataViews}
            trigger={{
              label: currentIndexPattern || SELECT_DATA_VIEW,
              fullWidth: true,
              color: fieldState.invalid ? 'danger' : 'text',
              isLoading: isDataViewsLoading,
              'data-test-subj': 'indexSelection',
            }}
            onChangeDataView={(newId: string) => {
              setValue(INDEX_FIELD, getDataViewPatternById(newId)!);
              field.onChange(newId);
              dataViewsService.get(newId).then((dataView) => {
                if (dataView.timeFieldName) {
                  setValue(TIMESTAMP_FIELD, dataView.timeFieldName);
                }
              });
            }}
            onAddField={
              currentDataViewId && selectedDataView
                ? () => {
                    dataViewFieldEditor.openEditor({
                      ctx: {
                        dataView: selectedDataView,
                      },
                      onSave: () => {},
                    });
                  }
                : undefined
            }
            currentDataViewId={field.value ?? getDataViewIdByIndexPattern(currentIndexPattern)?.id}
            onDataViewCreated={() => {
              dataViewEditor.openEditor({
                allowAdHocDataView: true,
                onSave: (dataView: DataView) => {
                  if (!dataView.isPersisted()) {
                    setAdHocDataViews([...adHocDataViews, dataView]);
                    field.onChange(dataView.id);
                    setValue(INDEX_FIELD, dataView.getIndexPattern());
                  } else {
                    refetch();
                    field.onChange(dataView.id);
                    setValue(INDEX_FIELD, getDataViewPatternById(dataView.id)!);
                  }
                  if (dataView.timeFieldName) {
                    setValue(TIMESTAMP_FIELD, dataView.timeFieldName);
                  }
                },
              });
            }}
          />
        )}
      />
    </EuiFormRow>
  );
}

const SELECT_DATA_VIEW = i18n.translate('xpack.slo.sloEdit.customKql.dataViewSelection.label', {
  defaultMessage: 'Select a Data view',
});

const INDEX_LABEL = i18n.translate('xpack.slo.sloEdit.customKql.indexSelection.label', {
  defaultMessage: 'Index',
});
