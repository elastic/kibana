/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiButton } from '@elastic/eui';
import styled from 'styled-components';

import { IndexPattern } from '../../../../../../../src/plugins/data/public';
import { useKibana } from '../../../common/lib/kibana';

import * as i18n from './translations';
import { useIndexFields } from '../../../common/containers/source';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';

interface CreateFieldButtonProps {
  selectedDataViewId: string;
  onClick: () => void;
  scopeId: SourcererScopeName;
}
const StyledButton = styled(EuiButton)`
  margin-left: ${({ theme }) => theme.eui.paddingSizes.m};
`;

export const CreateFieldButton = React.memo<CreateFieldButtonProps>(
  ({ selectedDataViewId, onClick: onClickParam, scopeId }) => {
    const { indexFieldsSearch } = useIndexFields(scopeId, false);

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
          onSave: () => {
            indexFieldsSearch(selectedDataViewId);
          },
        });
      }
      onClickParam();
    }, [indexPatternFieldEditor, dataView, selectedDataViewId, onClickParam, indexFieldsSearch]);

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
          isLoading={!dataView}
        >
          {i18n.CREATE_FIELD}
        </StyledButton>
      </>
    );
  }
);

CreateFieldButton.displayName = 'CreateFieldButton';
