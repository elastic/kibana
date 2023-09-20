/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { sortBy } from 'lodash';
import type { CasesConfigurationUI } from '../../../../common/ui';
import type { CaseUI } from '../../../../common';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { builderMap as customFieldsBuilderMap } from '../../custom_fields/builder';

interface Props {
  isLoading: boolean;
  customFields: CaseUI['customFields'];
  customFieldsConfiguration: CasesConfigurationUI['customFields'];
  onSubmit: (customField: CaseUI['customFields'][number]) => void;
}

const CustomFieldsComponent: React.FC<Props> = ({
  isLoading,
  customFields,
  customFieldsConfiguration,
  onSubmit,
}) => {
  const { permissions } = useCasesContext();
  const sortedCustomFields = useMemo(() => sortCustomFieldsByLabel(customFields), [customFields]);

  const customFieldsComponents = sortedCustomFields.map((customField) => {
    const customFieldFactory = customFieldsBuilderMap[customField.type];
    const customFieldType = customFieldFactory().build();

    const customFieldConfiguration = customFieldsConfiguration.find(
      (configuration) => configuration.key === customField.key
    );

    const EditComponent = customFieldType.Edit;

    /**
     * If the configuration does not exists
     * we should not show the custom field.
     * This can happen if a user deletes the
     * custom field definition from the configuration
     * page.
     */
    if (!customFieldConfiguration) {
      return null;
    }

    return (
      <EditComponent
        isLoading={isLoading}
        canUpdate={permissions.update}
        customFieldConfiguration={customFieldConfiguration}
        customField={customField}
        onSubmit={onSubmit}
        key={customField.key}
      />
    );
  });

  return <>{customFieldsComponents}</>;
};

CustomFieldsComponent.displayName = 'CustomFields';

export const CustomFields = React.memo(CustomFieldsComponent);

const sortCustomFieldsByLabel = (customFields: Props['customFields']) => {
  return sortBy(customFields, (customField) => {
    const customFieldFactory = customFieldsBuilderMap[customField.type];
    const customFieldType = customFieldFactory();

    return customFieldType.label;
  });
};
