/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiButtonEmpty, EuiEmptyPrompt } from '@elastic/eui';

import * as i18n from '../translations';
import { Draggable } from './draggable';

export interface ListOption {
  content: string;
  id: string;
}
export interface Props {
  disabled: boolean;
  isLoading: boolean;
  onChange: (listValues: ListOption[]) => void;
  listValues: ListOption[];
}

const ListOptionsComponent: React.FC<Props> = (props) => {
  const { disabled, isLoading, listValues, onChange } = props;
  const [isEditingEnabled, setIsEditingEnabled] = useState(false);

  const onAddOption = useCallback(() => {
    const newOption = { id: `${listValues.length + 1}`, content: '' };

    setIsEditingEnabled(true);

    onChange([...listValues, newOption]);
  }, [onChange, listValues, setIsEditingEnabled]);

  return (
    <>
      {listValues.length ? <EuiSpacer size="l" /> : null}
      <EuiFlexGroup justifyContent="flexStart">
        <EuiFlexItem grow={true}>
          <EuiEmptyPrompt
            body={
              <Draggable
                {...props}
                isEditingEnabled={isEditingEnabled}
                handleEditingEnabled={setIsEditingEnabled}
              />
            }
            color="subdued"
            className="eui-fullWidth"
            css={css`
              max-width: 100%;
              .euiEmptyPrompt__main {
                padding: 12px;
              }
              .euiEmptyPrompt__contentInner {
                max-width: none;
              }
            `}
            actions={
              <EuiButtonEmpty
                isDisabled={disabled}
                isLoading={isLoading}
                size="s"
                onClick={onAddOption}
                iconType="plusInCircle"
                data-test-subj="custom-field-add-list-option-btn"
              >
                {i18n.LIST_ADD_OPTION}
              </EuiButtonEmpty>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

ListOptionsComponent.displayName = 'ListOptions';

export const ListOptions = React.memo(ListOptionsComponent);
