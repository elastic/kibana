/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import { Controller, FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { EntityDefinition } from '@kbn/entities-schema';
import { EuiButton, EuiFieldText, EuiForm, EuiFormRow } from '@elastic/eui';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { useKibana } from '../../../hooks/use_kibana';
import { paths } from '../../../../common/locators/paths';
import { ENTITY_MANAGER_LABEL } from '../../../../common/translations';
import { IndexPatternInput } from './components/index_pattern';

const PAGE_TITLE = i18n.translate('xpack.entityManager.createPage.title', {
  defaultMessage: 'Create new definition',
});

const DEFAULT_VALUES = {
  id: '',
  name: '',
  indexPatterns: [],
};

export function EntityManagerCreatePage() {
  const {
    http: { basePath },
  } = useKibana().services;

  useBreadcrumbs([
    {
      href: basePath.prepend(paths.entities),
      text: ENTITY_MANAGER_LABEL,
      deepLinkId: 'entityManager',
    },
    {
      text: PAGE_TITLE,
    },
  ]);

  const { ObservabilityPageTemplate } = usePluginContext();

  const methods = useForm<EntityDefinition>({
    defaultValues: DEFAULT_VALUES,
    mode: 'all',
  });
  const { control, handleSubmit } = methods;

  const onSubmit: SubmitHandler<EntityDefinition> = (data) => {
    console.log(data);
  };

  return (
    <ObservabilityPageTemplate pageHeader={{ pageTitle: PAGE_TITLE }}>
      <FormProvider {...methods}>
        <EuiForm>
          <Controller
            name="id"
            rules={{ required: true }}
            defaultValue=""
            control={control}
            render={({ field: { ref, ...field }, fieldState }) => (
              <EuiFormRow label="Definition ID">
                <EuiFieldText {...field} fullWidth isInvalid={fieldState.invalid} />
              </EuiFormRow>
            )}
          />
          <Controller
            name="name"
            rules={{ required: true }}
            defaultValue=""
            control={control}
            render={({ field: { ref, ...field }, fieldState }) => (
              <EuiFormRow label="Name">
                <EuiFieldText {...field} fullWidth isInvalid={fieldState.invalid} />
              </EuiFormRow>
            )}
          />
          <IndexPatternInput />
          <EuiButton onClick={handleSubmit(onSubmit)}>Submit</EuiButton>
        </EuiForm>
      </FormProvider>
    </ObservabilityPageTemplate>
  );
}
