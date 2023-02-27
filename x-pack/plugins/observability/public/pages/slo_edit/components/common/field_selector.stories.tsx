/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { FormProvider, useForm } from 'react-hook-form';
import { KibanaReactStorybookDecorator } from '../../../../utils/kibana_react.storybook_decorator';
import { FieldSelector as Component, Props } from './field_selector';
import { SLO_EDIT_FORM_DEFAULT_VALUES } from '../../constants';

export default {
  component: Component,
  title: 'app/SLO/EditPage/Common/FieldSelector',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = (props: Props) => {
  const methods = useForm({ defaultValues: SLO_EDIT_FORM_DEFAULT_VALUES });
  return (
    <FormProvider {...methods}>
      <Component {...props} />
    </FormProvider>
  );
};

const defaultProps: Omit<Props, 'control'> = {
  dataTestSubj: 'dataTestSubj',
  name: 'name' as const,
  placeholder: 'Select the APM service',
  fieldName: 'service.name',
  label: 'Service name',
};

export const FieldSelector = Template.bind({});
FieldSelector.args = defaultProps;
