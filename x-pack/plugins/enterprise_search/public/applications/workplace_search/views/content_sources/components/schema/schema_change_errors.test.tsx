/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../../../__mocks__';

import React from 'react';
import { useParams } from 'react-router-dom';

import { shallow } from 'enzyme';

import { SchemaErrorsAccordion } from '../../../../../shared/schema';

import { SchemaChangeErrors } from './schema_change_errors';

describe('SchemaChangeErrors', () => {
  const fieldCoercionErrors = [] as any;
  const serverSchema = {
    foo: 'string',
  };
  it('renders', () => {
    setMockValues({ fieldCoercionErrors, serverSchema });
    setMockActions({ initializeSchemaFieldErrors: jest.fn() });

    (useParams as jest.Mock).mockImplementationOnce(() => ({
      activeReindexJobId: '1',
      sourceId: '123',
    }));
    const wrapper = shallow(<SchemaChangeErrors />);

    expect(wrapper.find(SchemaErrorsAccordion)).toHaveLength(1);
  });
});
