/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { sortBy } from 'lodash';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';

import type { CasesConfigurationUI } from '../../../common/ui';
import { builderMap as customFieldsBuilderMap } from '../custom_fields/builder';
import * as i18n from './translations';

interface Props {
  isLoading: boolean;
  customFieldsConfiguration: CasesConfigurationUI['customFields'];
}

const CustomFieldsComponent: React.FC<Props> = ({ isLoading, customFieldsConfiguration }) => {
  const sortedCustomFields = useMemo(
    () => sortCustomFieldsByLabel(customFieldsConfiguration),
    [customFieldsConfiguration]
  );

  const customFieldsComponents = sortedCustomFields.map(
    (customField: CasesConfigurationUI['customFields'][number]) => {
      const customFieldFactory = customFieldsBuilderMap[customField.type];
      const customFieldType = customFieldFactory().build();

      const CreateComponent = customFieldType.Create;

      return (
        <CreateComponent
          isLoading={isLoading}
          customFieldConfiguration={customField}
          key={customField.key}
        />
      );
    }
  );

  if (!customFieldsConfiguration.length) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiText size="m">
        <h3>{i18n.ADDITIONAL_FIELDS}</h3>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiFlexItem data-test-subj="create-case-custom-fields">{customFieldsComponents}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

CustomFieldsComponent.displayName = 'CustomFields';

export const CustomFields = React.memo(CustomFieldsComponent);

const sortCustomFieldsByLabel = (configCustomFields: CasesConfigurationUI['customFields']) => {
  return sortBy(configCustomFields, (configCustomField) => {
    return configCustomField.label;
  });
};
