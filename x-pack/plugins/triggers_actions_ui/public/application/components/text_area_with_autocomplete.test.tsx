/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { IToasts } from '@kbn/core/public';
import { render, screen } from '@testing-library/react';
import { TextAreaWithAutocomplete } from './text_area_with_autocomplete';
import { useKibana } from '../../common/lib/kibana';

const Providers = ({ children }: { children: any }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

const renderWithProviders = (ui: any) => {
  return render(ui, { wrapper: Providers });
};

jest.mock('../../common/lib/kibana');
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('Autocomplete component tests', () => {
  const addSuccess = jest.fn();
  const addError = jest.fn();

  const defaultMessageVariables = [
    {
      description: 'The action group of the alert that scheduled actions for the rule.',
      name: 'alert.actionGroup',
    },
    { description: 'The ID of the alert that scheduled actions for the rule.', name: 'alert.id' },
    {
      description: 'List of tags associated with the entity where this alert triggered.',
      name: 'context.tags',
    },
  ];
  beforeAll(() => {
    useKibanaMock().services.notifications.toasts = {
      addSuccess,
      addError,
    } as unknown as IToasts;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Render modal text area with autocomplete', async () => {
    renderWithProviders(
      <TextAreaWithAutocomplete
        messageVariables={defaultMessageVariables}
        paramsProperty="message"
        index={0}
        isDisabled={false}
        editAction={() => {}}
        label="Message"
        errors={[]}
      />
    );

    expect(await screen.findByText('')).toBeInTheDocument();
  });
});
