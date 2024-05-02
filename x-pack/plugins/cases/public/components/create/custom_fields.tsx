/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { sortBy } from 'lodash';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';

import { useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { CasesConfigurationUI } from '../../../common/ui';
import { builderMap as customFieldsBuilderMap } from '../custom_fields/builder';
import * as i18n from './translations';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useGetAllCaseConfigurations } from '../../containers/configure/use_get_all_case_configurations';
import { getConfigurationByOwner } from '../../containers/configure/utils';

interface Props {
  isLoading: boolean;
}

const CustomFieldsComponent: React.FC<Props> = ({ isLoading }) => {
  const { owner } = useCasesContext();
  const [{ selectedOwner }] = useFormData<{ selectedOwner: string }>({ watch: ['selectedOwner'] });
  const { data: configurations, isLoading: isLoadingCaseConfiguration } =
    useGetAllCaseConfigurations();

  const configurationOwner: string | undefined = selectedOwner ? selectedOwner : owner[0];
  const customFieldsConfiguration = useMemo(
    () =>
      getConfigurationByOwner({
        configurations,
        owner: configurationOwner,
      }).customFields ?? [],
    [configurations, configurationOwner]
  );

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
          isLoading={isLoading || isLoadingCaseConfiguration}
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
