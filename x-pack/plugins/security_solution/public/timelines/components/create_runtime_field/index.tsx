/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiButton, EuiLoadingSpinner } from '@elastic/eui';
import styled from 'styled-components';

import { IndexPattern } from '../../../../../../../src/plugins/data/public';
import { useKibana } from '../../../common/lib/kibana';

import * as i18n from './translations';
// import { useIndexFields } from '../../../common/containers/source';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';

interface CreateFieldButtonProps {
  selectedDataViewId: string;
  onClick: () => void;
  scopeId: SourcererScopeName;
}
const StyledButton = styled(EuiButton)`
  margin-left: ${({ theme }) => theme.eui.paddingSizes.m};
`;

//   const [indexPatternsLoading, { browserFields, indexPatterns }] = useFetchIndex(indexNames);
export const CreateFieldButton = React.memo<CreateFieldButtonProps>(
  ({ selectedDataViewId, onClick: onClickParam, scopeId }) => {
    // I can't use this hook because it fetches the data as soon as it is called.
    // const { indexFieldsSearch } = useIndexFields(scopeId);
    const indexFieldsSearch = (_: string) => undefined;

    const {
      indexPatternFieldEditor,
      data: { dataViews },
    } = useKibana().services;

    const [dataView, setDataView] = useState<IndexPattern | null>(null);

    useEffect(() => {
      dataViews.get(selectedDataViewId).then((dataViewResponse) => {
        setDataView(dataViewResponse);
      });
    }, [selectedDataViewId, dataViews]);

    const onClick = useCallback(() => {
      if (dataView) {
        indexPatternFieldEditor?.openEditor({
          ctx: { indexPattern: dataView },
          // fieldName: item.fieldName, edit?
          onSave: () => {
            indexFieldsSearch(selectedDataViewId);
          },
        });
      }
      onClickParam();
    }, [indexPatternFieldEditor, dataView, selectedDataViewId, onClickParam]);

    if (!indexPatternFieldEditor?.userPermissions.editIndexPattern()) {
      return null;
    }

    return (
      <>
        <StyledButton
          iconType={dataView ? 'plusInCircle' : 'none'}
          aria-label={i18n.CREATE_FIELD}
          data-test-subj="create-field"
          onClick={onClick}
        >
          {dataView ? i18n.CREATE_FIELD : <EuiLoadingSpinner size="m" />}
        </StyledButton>
      </>
    );
  }
);

CreateFieldButton.displayName = 'CreateFieldButton';

// MUST HAVE
// alerts - Fix scope id bug. When I call useIndexFields it fetch the data and set t-grid loading state...
// Close modal
// refetch data after creating field
// check user permissions
// timeline
// display flyout over timeline (z-index issue)
// Fix create field loading state

// NICE TO HAVE
// Change "create field" flyout subtitle
// edit field
// delete field
// automaticaly display the added field? (it shows on one mockup)
