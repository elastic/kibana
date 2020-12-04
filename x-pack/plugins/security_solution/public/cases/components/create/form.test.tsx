/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { useForm, Form } from '../../../shared_imports';
import { useGetTags } from '../../containers/use_get_tags';
import { useConnectors } from '../../containers/configure/use_connectors';
import { connectorsMock } from '../../containers/mock';
import { schema, FormProps } from './schema';
import { CreateCaseForm } from './form';

jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/configure/use_connectors');
const useGetTagsMock = useGetTags as jest.Mock;
const useConnectorsMock = useConnectors as jest.Mock;

const initialCaseValue: FormProps = {
  description: '',
  tags: [],
  title: '',
  connectorId: 'none',
  fields: null,
};

describe('CreateCaseForm', () => {
  const MockHookWrapperComponent: React.FC = ({ children }) => {
    const { form } = useForm<FormProps>({
      defaultValue: initialCaseValue,
      options: { stripEmptyFields: false },
      schema,
    });

    return <Form form={form}>{children}</Form>;
  };

  beforeEach(() => {
    jest.resetAllMocks();
    useGetTagsMock.mockReturnValue({ tags: ['test'] });
    useConnectorsMock.mockReturnValue({ loading: false, connectors: connectorsMock });
  });

  it('it renders with steps', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <CreateCaseForm />
      </MockHookWrapperComponent>
    );

    expect(wrapper.find(`[data-test-subj="case-creation-form-steps"]`).exists()).toBeTruthy();
  });

  it('it renders without steps', async () => {
    const wrapper = mount(
      <MockHookWrapperComponent>
        <CreateCaseForm withSteps={false} />
      </MockHookWrapperComponent>
    );

    expect(wrapper.find(`[data-test-subj="case-creation-form-steps"]`).exists()).toBeFalsy();
  });
});
