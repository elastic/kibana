/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useDispatch } from 'react-redux';
import { IndexPattern, IndexPatternField } from '../../../../../../../src/plugins/data/public';
import { useKibana } from '../../../common/lib/kibana';

import { RuntimeFieldEditorType, TimelineId } from '../../../../../timelines/common';
import { tGridActions } from '../../../../../timelines/public';
import { getRuntimeFieldSearch } from '../../../common/containers/source/runtime_field';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { sourcererSelectors } from '../../../common/store';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../components/timeline/body/constants';
import { defaultColumnHeaderType } from '../../components/timeline/body/column_headers/default_headers';
import { sourcererActions } from '../../../common/store/actions';

export const useRuntimeFieldEditor = (
  sourcererScope: SourcererScopeName,
  timelineId: TimelineId
): RuntimeFieldEditorType => {
  const scopeIdSelector = useMemo(() => sourcererSelectors.scopeIdSelector(), []);
  const { selectedDataViewId } = useDeepEqualSelector((state) =>
    scopeIdSelector(state, sourcererScope)
  );

  const { data } = useKibana().services;
  const [dataView, setDataView] = useState<IndexPattern | null>(null);
  const dispatch = useDispatch();

  const {
    indexPatternFieldEditor,
    data: { dataViews },
  } = useKibana().services;

  useEffect(() => {
    dataViews.get(selectedDataViewId).then((dataViewResponse) => {
      setDataView(dataViewResponse);
    });
  }, [selectedDataViewId, dataViews]);

  const openDeleteFieldModal = useCallback(
    (fieldName: string, fieldCategory: string) => {
      if (dataView) {
        indexPatternFieldEditor?.openDeleteModal({
          ctx: { indexPattern: dataView },
          fieldName,
          onDelete: () => {
            dispatch(
              sourcererActions.removeRuntimeField({
                id: selectedDataViewId,
                fieldName,
                fieldCategory,
              })
            );

            dispatch(
              tGridActions.removeColumn({
                columnId: fieldName,
                id: timelineId,
              })
            );
          },
        });
      }
    },
    [indexPatternFieldEditor, dataView, timelineId, dispatch, selectedDataViewId]
  );

  const openFieldEditor = useCallback(
    (fieldName?: string, fieldCategory?: string) => {
      if (dataView) {
        indexPatternFieldEditor?.openEditor({
          ctx: { indexPattern: dataView },
          fieldName,
          onSave: async (savedField: IndexPatternField) => {
            const response = await getRuntimeFieldSearch({
              data,
              dataViewId: selectedDataViewId,
              fieldName: savedField.name,
            });

            if (fieldName && fieldCategory) {
              // Remove previous entry from store when editing a field
              dispatch(
                sourcererActions.removeRuntimeField({
                  id: selectedDataViewId,
                  fieldName,
                  fieldCategory,
                })
              );
            }

            // Remove old field from event table when renaming a field
            if (fieldName && fieldName !== savedField.name) {
              dispatch(
                tGridActions.removeColumn({
                  columnId: fieldName,
                  id: timelineId,
                })
              );
            }

            // Add field to the store
            dispatch(
              sourcererActions.addRuntimeField({
                id: selectedDataViewId,
                indexField: response.indexField,
                runtimeMapping: response.runtimeMapping,
              })
            );

            // Add field to the event table when adding a new field or renaming an existing field
            if (!fieldName || fieldName !== savedField.name) {
              dispatch(
                tGridActions.upsertColumn({
                  column: {
                    columnHeaderType: defaultColumnHeaderType,
                    id: savedField.name,
                    initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
                  },
                  id: timelineId,
                  index: 0,
                })
              );
            }
          },
        });
      }
    },
    [indexPatternFieldEditor, dataView, selectedDataViewId, dispatch, timelineId, data]
  );

  return {
    openFieldEditor,
    openDeleteFieldModal,
    isLoading: !dataView,
    hasEditPermission: indexPatternFieldEditor?.userPermissions.editIndexPattern(),
  };
};
