/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { sortBy } from 'lodash';
import { EuiFlexItem } from '@elastic/eui';
import type { CasesConfigurationUI, CaseUICustomField } from '../../../../common/ui';
import type { CaseUI } from '../../../../common';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { builderMap as customFieldsBuilderMap } from '../../custom_fields/builder';

interface Props {
  isLoading: boolean;
  customFields: CaseUI['customFields'];
  customFieldsConfiguration: CasesConfigurationUI['customFields'];
  onSubmit: (customField: CaseUICustomField) => void;
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
      onSubmit(customFieldToAdd);
    },
    [onSubmit]
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
