/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { sortBy } from 'lodash';
import type { CasesConfigurationUI } from '../../../common/ui';
import { useCasesContext } from '../cases_context/use_cases_context';
import { builderMap as customFieldsBuilderMap } from '../custom_fields/builder';

interface Props {
  isLoading: boolean;
  customFieldsConfiguration: CasesConfigurationUI['customFields'];
}

const CustomFieldsComponent: React.FC<Props> = ({ isLoading, customFieldsConfiguration }) => {
  const { permissions } = useCasesContext();

  if (!customFieldsConfiguration.length) {
    return null;
  }

  const sortedCustomFields = useMemo(
    () => sortCustomFieldsByLabel(customFieldsConfiguration),
    [customFieldsConfiguration]
  );

  const customFieldsComponents = sortedCustomFields.map(
    (customField: CasesConfigurationUI['customFields'][number]) => {
      const customFieldFactory = customFieldsBuilderMap[customField.type];
      const customFieldType = customFieldFactory().build();

      const CreateComponent = customFieldType.Create;

      if (!permissions.create || !permissions.update) {
        return null;
      }

      return (
        <React.Fragment
          data-test-subj={`create-case-custom-field-wrapper-${customField.key}`}
          key={customField.key}
        >
        <CreateComponent
          isLoading={isLoading}
          customFieldConfiguration={customField}
        />
        </React.Fragment>
      );
    }
  );

  return <>{customFieldsComponents}</>;
};

CustomFieldsComponent.displayName = 'CustomFields';

export const CustomFields = React.memo(CustomFieldsComponent);

const sortCustomFieldsByLabel = (configCustomFields: CasesConfigurationUI['customFields']) => {
  return sortBy(configCustomFields, (configCustomField) => {
    return configCustomField.label;
  });
};
