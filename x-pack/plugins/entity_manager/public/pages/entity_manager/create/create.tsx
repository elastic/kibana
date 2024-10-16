/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import { Controller, FormProvider, SubmitHandler, useForm } from 'react-hook-form';
import { EntityDefinition } from '@kbn/entities-schema';
import { EuiButton, EuiFieldText, EuiForm, EuiFormRow } from '@elastic/eui';
import { isHttpFetchError } from '@kbn/server-route-repository-client';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { useKibana } from '../../../hooks/use_kibana';
import { paths } from '../../../../common/locators/paths';
import { ENTITY_MANAGER_LABEL } from '../../../../common/translations';
import { IndexPatternInput } from './components/index_pattern';
import { IdentityFieldsInput } from './components/identity_fields';
import { MetadataFieldsInput } from './components/metadata';

const PAGE_TITLE = i18n.translate('xpack.entityManager.createPage.title', {
  defaultMessage: 'Create new definition',
});

const DEFAULT_VALUES = {
  id: '',
  name: '',
  type: '',
  indexPatterns: [],
  displayNameTemplate: '{{service.name}}',
  version: '1.0.0',
  identityFields: [{ field: '', optional: false }],
  metadata: [],
  metrics: [],
  latest: {
    timestampField: '@timestamp',
  },
};

export function EntityManagerCreatePage() {
  const {
    http: { basePath },
    entityClient,
  } = useKibana().services;
  const history = useHistory();
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

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

  const onSubmit: SubmitHandler<EntityDefinition> = async (data) => {
    setErrors([]);
    setIsCreating(true);

    try {
      const definition = await entityClient.repositoryClient('POST /internal/entities/definition', {
        params: {
          query: { installOnly: false },
          body: data,
        },
      });

      history.replace({ pathname: `/${definition.id}` });
    } catch (err) {
      if (isHttpFetchError(err) && err.body?.message) {
        setErrors([err.body.message]);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <ObservabilityPageTemplate pageHeader={{ pageTitle: PAGE_TITLE }}>
      <FormProvider {...methods}>
        <EuiForm isInvalid={errors.length > 0} error={errors}>
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
            name="type"
            rules={{ required: true }}
            defaultValue=""
            control={control}
            render={({ field: { ref, ...field }, fieldState }) => (
              <EuiFormRow label="Type">
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

          <IdentityFieldsInput control={control} />

          <MetadataFieldsInput control={control} />

          <EuiButton onClick={handleSubmit(onSubmit)} isLoading={isCreating}>
            {isCreating ? 'Creating...' : 'Create definition'}
          </EuiButton>
        </EuiForm>
      </FormProvider>
    </ObservabilityPageTemplate>
  );
}
