/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React, { useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ActionConnector, TemplateConfiguration } from '../../../common/types/domain';
import type { FormState } from '../configure_cases/flyout';
import { schema } from './schema';
import { FormFields } from './form_fields';
import { templateDeserializer, templateSerializer } from './utils';
import type { TemplateFormProps } from './types';
import type { CasesConfigurationUI } from '../../containers/types';

interface Props {
  onChange: (state: FormState<TemplateConfiguration, TemplateFormProps>) => void;
  initialValue: TemplateConfiguration | null;
  connectors: ActionConnector[];
  currentConfiguration: CasesConfigurationUI;
  isEditMode?: boolean;
}

const FormComponent: React.FC<Props> = ({
  onChange,
  initialValue,
  connectors,
  currentConfiguration,
  isEditMode = false,
}) => {
  const keyDefaultValue = useMemo(() => uuidv4(), []);

  const { form } = useForm({
    defaultValue: initialValue ?? {
      key: keyDefaultValue,
      name: '',
      description: '',
      tags: [],
      caseFields: {
        connector: currentConfiguration.connector,
      },
    },
    options: { stripEmptyFields: false },
    schema,
    deserializer: templateDeserializer,
    serializer: (data: TemplateFormProps) =>
      templateSerializer(connectors, currentConfiguration, data),
  });

  const { submit, isValid, isSubmitting } = form;

  useEffect(() => {
    if (onChange) {
      onChange({ isValid, submit });
    }
  }, [onChange, isValid, submit]);

  return (
    <Form form={form}>
      <FormFields
        isSubmitting={isSubmitting}
        connectors={connectors}
        currentConfiguration={currentConfiguration}
        isEditMode={isEditMode}
      />
    </Form>
  );
};

FormComponent.displayName = 'TemplateForm';

export const TemplateForm = React.memo(FormComponent);
