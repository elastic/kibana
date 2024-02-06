/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { sortBy } from 'lodash';
import { EuiFlexItem } from '@elastic/eui';
import type {
  CasesConfigurationUI,
  CasesConfigurationUICustomField,
  CaseUICustomField,
} from '../../../../common/ui';
import type { CaseUI } from '../../../../common';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { builderMap as customFieldsBuilderMap } from '../../custom_fields/builder';
import { addOrReplaceCustomField } from '../../custom_fields/utils';
interface Props {
  isLoading: boolean;
  customFields: CaseUI['customFields'];
  customFieldsConfiguration: CasesConfigurationUI['customFields'];
  onSubmit: (customFields: CaseUICustomField[]) => void;
}

const CustomFieldsComponent: React.FC<Props> = ({
  isLoading,
  customFields,
  customFieldsConfiguration,
  onSubmit,
}) => {
  const { permissions } = useCasesContext();
  const sortedCustomFieldsConfiguration = useMemo(
    () => sortCustomFieldsByLabel(customFieldsConfiguration),
    [customFieldsConfiguration]
  );

  const onSubmitCustomField = useCallback(
    (customFieldToAdd) => {
      const allCustomFields = createMissingAndRemoveExtraCustomFields(
        customFields,
        customFieldsConfiguration
      );

      const updatedCustomFields = addOrReplaceCustomField(allCustomFields, customFieldToAdd);

      onSubmit(updatedCustomFields);
    },
    [customFields, customFieldsConfiguration, onSubmit]
  );

  const customFieldsComponents = sortedCustomFieldsConfiguration.map((customFieldConf) => {
    const customFieldFactory = customFieldsBuilderMap[customFieldConf.type];
    const customFieldType = customFieldFactory().build();

    const customField = customFields.find((field) => field.key === customFieldConf.key);

    const EditComponent = customFieldType.Edit;

    return (
      <EuiFlexItem
        grow={false}
        data-test-subj={`case-custom-field-wrapper-${customFieldConf.key}`}
        key={customFieldConf.key}
      >
        <EditComponent
          isLoading={isLoading}
          canUpdate={permissions.update}
          customFieldConfiguration={customFieldConf}
          customField={customField}
          onSubmit={onSubmitCustomField}
        />
      </EuiFlexItem>
    );
  });

  return <>{customFieldsComponents}</>;
};

CustomFieldsComponent.displayName = 'CustomFields';

export const CustomFields = React.memo(CustomFieldsComponent);

const sortCustomFieldsByLabel = (customFieldsConfiguration: Props['customFieldsConfiguration']) => {
  return sortBy(customFieldsConfiguration, (customFieldConf) => {
    return customFieldConf.label;
  });
};

const createMissingAndRemoveExtraCustomFields = (
  customFields: CaseUICustomField[],
  confCustomFields: CasesConfigurationUICustomField[]
): CaseUICustomField[] => {
  const createdCustomFields: CaseUICustomField[] = confCustomFields.map((confCustomField) => {
    const foundCustomField = customFields.find(
      (customField) => customField.key === confCustomField.key
    );

    const shouldUseDefaultValue = Boolean(
      confCustomField.required && confCustomField?.defaultValue
    );

    if (foundCustomField) {
      return {
        ...foundCustomField,
        value:
          foundCustomField.value == null && shouldUseDefaultValue
            ? confCustomField.defaultValue
            : foundCustomField.value,
      } as CaseUICustomField;
    }

    return {
      key: confCustomField.key,
      type: confCustomField.type,
      value: shouldUseDefaultValue ? confCustomField.defaultValue : null,
    } as CaseUICustomField;
  });

  return createdCustomFields;
};
