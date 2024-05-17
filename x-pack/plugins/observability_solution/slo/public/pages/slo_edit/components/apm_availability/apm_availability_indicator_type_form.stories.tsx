/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentStory } from '@storybook/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { KibanaReactStorybookDecorator } from '@kbn/observability-plugin/public';
import { SLO_EDIT_FORM_DEFAULT_VALUES } from '../../constants';
import { ApmAvailabilityIndicatorTypeForm as Component } from './apm_availability_indicator_type_form';

export default {
  component: Component,
  title: 'app/SLO/EditPage/ApmAvailability/Form',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = () => {
  const methods = useForm({ defaultValues: SLO_EDIT_FORM_DEFAULT_VALUES });
  return (
    <FormProvider {...methods}>
      <Component />
    </FormProvider>
  );
};

const defaultProps = {};

export const Form = Template.bind({});
Form.args = defaultProps;
