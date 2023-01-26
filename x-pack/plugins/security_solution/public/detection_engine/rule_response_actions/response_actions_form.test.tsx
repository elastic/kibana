/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';

import { ResponseActionsForm } from './response_actions_form';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { ArrayItem } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { getMockTheme } from '../../common/lib/kibana/kibana_react.mock';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
  useParams: () => ({
    detailName: 'testId',
  }),
}));
jest.mock('../../common/lib/kibana', () => {
  const original = jest.requireActual('../../common/lib/kibana');
  return {
    ...original,
    useToasts: jest.fn().mockReturnValue({
      addError: jest.fn(),
      addSuccess: jest.fn(),
      addWarning: jest.fn(),
      remove: jest.fn(),
    }),
  };
});

import * as rules from '../rule_management/logic/use_rule';
// @ts-expect-error we don't really care about thr useRule return value
jest.spyOn(rules, 'useRule').mockReturnValue({});

const renderWithContext = (Element: React.ReactElement) => {
  const mockTheme = getMockTheme({ eui: { euiColorLightestShade: '#F5F7FA' } });

  return render(
    <ThemeProvider theme={mockTheme}>
      <IntlProvider locale={'en'}>{Element}</IntlProvider>
    </ThemeProvider>
  );
};

describe('ResponseActionsForm', () => {
  const Component = (props: { items: ArrayItem[] }) => {
    const { form } = useForm();
    return (
      <Form form={form}>
        <ResponseActionsForm addItem={jest.fn()} removeItem={jest.fn()} {...props} form={form} />
      </Form>
    );
  };
  it('renders correctly', async () => {
    const { getByTestId, queryByTestId } = renderWithContext(<Component items={[]} />);
    expect(getByTestId('response-actions-form'));
    expect(getByTestId('response-actions-header'));
    expect(getByTestId('response-actions-wrapper'));
    expect(queryByTestId('response-actions-list'));
    expect(queryByTestId('response-actions-list-item-0')).toEqual(null);
  });
  it('renders list of elements', async () => {
    const { getByTestId, queryByTestId } = renderWithContext(
      <Component
        items={[
          { path: '1', id: 1, isNew: false },
          { path: '2', id: 2, isNew: false },
        ]}
      />
    );
    const list = getByTestId('response-actions-list');
    expect(getByTestId('response-actions-form'));
    expect(getByTestId('response-actions-header'));
    expect(list);
    expect(queryByTestId('response-actions-list-item-0')).not.toEqual(null);
    expect(queryByTestId('response-actions-list-item-1')).not.toEqual(null);
  });
});
