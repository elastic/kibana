/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import {
  uiSettingsServiceMock,
  i18nServiceMock,
} from '../../../../../../../../../../src/core/public/mocks';

import { Form, useForm, KibanaContextProvider } from '../../../../../../shared_imports';
import { Grok } from './grok';

// @ts-ignore
window.Worker = function () {
  this.postMessage = () => {};
  (this as any).terminate = () => {};
};

describe('<Grok/>', () => {
  const setup = (props?: { defaultValue: Record<string, any> }) => {
    function MyComponent() {
      const { form } = useForm({ defaultValue: props?.defaultValue });
      const i18n = i18nServiceMock.createStartContract();
      return (
        <KibanaContextProvider
          services={{ uiSettings: uiSettingsServiceMock.createSetupContract() }}
        >
          <i18n.Context>
            <Form form={form}>
              <Grok />
            </Form>
          </i18n.Context>
        </KibanaContextProvider>
      );
    }
    return mount(<MyComponent />);
  };

  beforeAll(() => {
    // disable all react-beautiful-dnd development warnings
    (window as any)['__react-beautiful-dnd-disable-dev-warnings'] = true;
  });

  afterAll(() => {
    // enable all react-beautiful-dnd development warnings
    (window as any)['__react-beautiful-dnd-disable-dev-warnings'] = false;
  });
  test('smoke', () => {
    setup({ defaultValue: { type: 'grok', fields: { patterns: ['test'] } } });
  });
});
