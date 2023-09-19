/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiEmptyPrompt, EuiButtonEmpty, EuiDescribedFormGroup, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';

import * as i18n from './translations';
import { useCasesContext } from '../cases_context/use_cases_context';
import type { CustomFieldsConfiguration } from '../../../common/types/domain';
import type { ListOption } from './draggable';
import { Draggable } from './draggable';
export interface Props {
  customFields: CustomFieldsConfiguration;
  disabled: boolean;
  isLoading: boolean;
  handleAddCustomField: () => void;
}
const CustomFieldsComponent: React.FC<Props> = ({
  disabled,
  isLoading,
  handleAddCustomField,
  customFields,
}) => {
  const { permissions } = useCasesContext();
  const canAddCustomFields = permissions.create && permissions.update;

  const currentListValues: ListOption[] = useMemo(() => {
    if (!customFields) {
      return [];
    }

    return customFields.map((field) => {
      return {
        id: field.key,
        content: field.label,
        type: field.type,
      };
    });
  }, [customFields]);

  return canAddCustomFields ? (
    <EuiDescribedFormGroup
      fullWidth
      title={<h3>{i18n.TITLE}</h3>}
      description={
        <>
          <p>{i18n.DESCRIPTION}</p>
        </>
      }
      data-test-subj="custom-fields-form-group"
    >
      <EuiEmptyPrompt
        color="subdued"
        className="eui-fullWidth"
        css={css`
          max-width: 580px;
          .euiEmptyPrompt__main {
            padding: 0px;
            padding-bottom: 16px;
          }
          .euiEmptyPrompt__contentInner {
            max-width: none;
          }
        `}
        body={
          customFields?.length ? (
            <Draggable listValues={currentListValues} />
          ) : (
            <>
              <EuiSpacer size="m" />
              {i18n.NO_CUSTOM_FIELDS}
            </>
          )
        }
        actions={
          <EuiButtonEmpty
            isLoading={isLoading}
            isDisabled={disabled}
            size="s"
            onClick={handleAddCustomField}
            iconType="plusInCircle"
            data-test-subj="add-custom-field"
          >
            {i18n.ADD_CUSTOM_FIELD}
          </EuiButtonEmpty>
        }
      />
    </EuiDescribedFormGroup>
  ) : null;
};
CustomFieldsComponent.displayName = 'CustomFields';

export const CustomFields = React.memo(CustomFieldsComponent);
