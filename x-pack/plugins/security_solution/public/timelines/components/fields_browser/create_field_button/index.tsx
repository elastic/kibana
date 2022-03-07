/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MutableRefObject, useCallback, useEffect, useMemo, useState } from 'react';
import { EuiButton } from '@elastic/eui';
import styled from 'styled-components';

import { useDispatch } from 'react-redux';
import type {
  DataViewField,
  DataView,
} from '../../../../../../../../src/plugins/data_views/common';
import { useKibana } from '../../../../common/lib/kibana';

import * as i18n from './translations';
import { FieldBrowserOptions, TimelineId } from '../../../../../../timelines/common';
import { upsertColumn } from '../../../../../../timelines/public';
import { useDataView } from '../../../../common/containers/source/use_data_view';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { sourcererSelectors } from '../../../../common/store';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../timeline/body/constants';
import { defaultColumnHeaderType } from '../../timeline/body/column_headers/default_headers';

export type CreateFieldEditorActions = { closeEditor: () => void } | null;
export type CreateFieldEditorActionsRef = MutableRefObject<CreateFieldEditorActions>;

export interface CreateFieldButtonProps {
  selectedDataViewId: string;
  onClick: () => void;
  timelineId: TimelineId;
  editorActionsRef?: CreateFieldEditorActionsRef;
}
const StyledButton = styled(EuiButton)`
  margin-left: ${({ theme }) => theme.eui.paddingSizes.m};
`;

export const CreateFieldButton = React.memo<CreateFieldButtonProps>(
  ({ selectedDataViewId, onClick: onClickParam, timelineId, editorActionsRef }) => {
    const [dataView, setDataView] = useState<DataView | null>(null);
    const dispatch = useDispatch();

    const { indexFieldsSearch } = useDataView();
    const {
      dataViewFieldEditor,
      data: { dataViews },
      application: { capabilities },
    } = useKibana().services;

    useEffect(() => {
      dataViews.get(selectedDataViewId).then((dataViewResponse) => {
        setDataView(dataViewResponse);
      });
    }, [selectedDataViewId, dataViews]);

    const onClick = useCallback(() => {
      if (dataView) {
        const closeFieldEditor = dataViewFieldEditor?.openEditor({
          ctx: { dataView },
          onSave: async (field: DataViewField) => {
            // Fetch the updated list of fields
            await indexFieldsSearch(selectedDataViewId);

            // Add the new field to the event table, after waiting for browserFields to be stored
            dispatch(
              upsertColumn({
                column: {
                  columnHeaderType: defaultColumnHeaderType,
                  id: field.name,
                  initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
                },
                id: timelineId,
                index: 0,
              })
            );
          },
        });
        if (editorActionsRef) {
          editorActionsRef.current = {
            closeEditor: () => {
              editorActionsRef.current = null;
              closeFieldEditor();
            },
          };
        }
      }
      onClickParam();
    }, [
      dataViewFieldEditor,
      dataView,
      onClickParam,
      indexFieldsSearch,
      selectedDataViewId,
      dispatch,
      timelineId,
      editorActionsRef,
    ]);

    if (
      !dataViewFieldEditor?.userPermissions.editIndexPattern() ||
      // remove below check once resolved: https://github.com/elastic/kibana/issues/122462
      !capabilities.indexPatterns.save
    ) {
      return null;
    }

    return (
      <>
        <StyledButton
          iconType={dataView ? 'plusInCircle' : 'none'}
          aria-label={i18n.CREATE_FIELD}
          data-test-subj="create-field"
          onClick={onClick}
          isLoading={!dataView}
        >
          {i18n.CREATE_FIELD}
        </StyledButton>
      </>
    );
  }
);

CreateFieldButton.displayName = 'CreateFieldButton';

/**
 *
 * Returns a memoised 'CreateFieldButton' with only an 'onClick' property.
 */
export const useCreateFieldButton = (
  sourcererScope: SourcererScopeName,
  timelineId: TimelineId,
  editorActionsRef?: CreateFieldEditorActionsRef
) => {
  const scopeIdSelector = useMemo(() => sourcererSelectors.scopeIdSelector(), []);
  const { missingPatterns, selectedDataViewId } = useDeepEqualSelector((state) =>
    scopeIdSelector(state, sourcererScope)
  );

  return useMemo(() => {
    if (selectedDataViewId == null || missingPatterns.length > 0) {
      return;
    }
    // It receives onClick props from field browser in order to close the modal.
    const CreateFieldButtonComponent: FieldBrowserOptions['createFieldButton'] = ({ onClick }) => (
      <CreateFieldButton
        selectedDataViewId={selectedDataViewId}
        onClick={onClick}
        timelineId={timelineId}
        editorActionsRef={editorActionsRef}
      />
    );

    return CreateFieldButtonComponent;
  }, [missingPatterns.length, selectedDataViewId, timelineId, editorActionsRef]);
};
