/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiButtonEmpty } from '@elastic/eui';
import { css } from '@emotion/react';

import * as i18n from '../translations';

import { useApplicationCapabilities } from '../../../common/lib/kibana';
import { useCasesContext } from '../../cases_context/use_cases_context';


export interface Props {
  disabled: boolean;
  isLoading: boolean;
  handleAddCustomField: () => void;
}
const CustomFieldsComponent: React.FC<Props> = ({
  disabled,
  isLoading,
  handleAddCustomField,
}) => {
  const { actions } = useApplicationCapabilities();
  const { permissions } = useCasesContext();
  const canAddCustomFields = permissions.connectors && actions.read;

  return (
    canAddCustomFields ? (
      <EuiEmptyPrompt
        color="subdued"
        className="eui-fullWidth"
        css={css`max-width: 580px;`}
        body={i18n.NO_CUSTOM_FIELDS}
        actions={
          <EuiButtonEmpty
            isDisabled={disabled}
            size="s"
            onClick={handleAddCustomField}
            iconType="plusInCircle"
            data-test-subj="cases-add-custom-field"
          >
            {i18n.ADD_CUSTOM_FIELD}
          </EuiButtonEmpty>
        }
      />
    )
      : null
  );
};
CustomFieldsComponent.displayName = 'CustomFields';

export const CustomFields = React.memo(CustomFieldsComponent);
