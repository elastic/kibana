/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { DataViewPicker } from '@kbn/unified-search-plugin/public';
import { getDataViewPattern, useAdhocDataViews } from './use_adhoc_data_views';
import { SloPublicPluginsStart } from '../../../..';
import { useKibana } from '../../../../utils/kibana_react';
import { CreateSLOForm } from '../../types';

export const DATA_VIEW_FIELD = 'indicator.params.dataViewId';
const INDEX_FIELD = 'indicator.params.index';
const TIMESTAMP_FIELD = 'indicator.params.timestampField';

export function IndexSelection({ selectedDataView }: { selectedDataView?: DataView }) {
  const { control, getFieldState, setValue, watch } = useFormContext<CreateSLOForm>();
  const { dataViews: dataViewsService, dataViewFieldEditor } = useKibana().services;

  const { dataViewEditor } = useKibana<SloPublicPluginsStart>().services;

  const currentIndexPattern = watch(INDEX_FIELD);
  const currentDataViewId = watch(DATA_VIEW_FIELD);

  const { dataViewsList, isDataViewsLoading, adHocDataViews, setAdHocDataViews, refetch } =
    useAdhocDataViews({
      currentIndexPattern,
    });

  useEffect(() => {
    const indPatternId = getDataViewPattern({
      byPatten: currentIndexPattern,
      dataViewsList,
      adHocDataViews,
    });
    if (!currentDataViewId && currentIndexPattern && !isDataViewsLoading && indPatternId) {
      setValue(DATA_VIEW_FIELD, indPatternId);
    }
  }, [
    adHocDataViews,
    currentDataViewId,
    currentIndexPattern,
    dataViewsList,
    isDataViewsLoading,
    setValue,
  ]);

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
              setValue(
                INDEX_FIELD,
                getDataViewPattern({ byId: newId, adHocDataViews, dataViewsList })!
              );
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
            currentDataViewId={
              field.value ??
              getDataViewPattern({
                byPatten: currentIndexPattern,
                dataViewsList,
                adHocDataViews,
              })
            }
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
                    setValue(INDEX_FIELD, dataView.getIndexPattern());
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
