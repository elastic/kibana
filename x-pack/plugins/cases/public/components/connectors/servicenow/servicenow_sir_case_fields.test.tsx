/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, render, screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';

import { useGetChoices } from './use_get_choices';
import { connector, choices } from '../mock';
import Fields from './servicenow_sir_case_fields';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { MockFormWrapperComponent } from '../test_utils';

jest.mock('../../../common/lib/kibana');
jest.mock('./use_get_choices');
const useGetChoicesMock = useGetChoices as jest.Mock;

describe('ServiceNowSIR Fields', () => {
  let user: UserEvent;
  let appMockRenderer: AppMockRenderer;

  const fields = {
    destIp: true,
    sourceIp: true,
    malwareHash: true,
    malwareUrl: true,
    priority: '1',
    category: 'Denial of Service',
    subcategory: '26',
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    // Workaround for timeout via https://github.com/testing-library/user-event/issues/833#issuecomment-1171452841
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    appMockRenderer = createAppMockRenderer();
    useGetChoicesMock.mockReturnValue({
      isLoading: false,
      isFetching: false,
      data: { data: choices },
    });
    jest.clearAllMocks();
  });

  it('all params fields are rendered', () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(screen.getByTestId('destIpCheckbox')).toBeInTheDocument();
    expect(screen.getByTestId('sourceIpCheckbox')).toBeInTheDocument();
    expect(screen.getByTestId('malwareUrlCheckbox')).toBeInTheDocument();
    expect(screen.getByTestId('malwareHashCheckbox')).toBeInTheDocument();
    expect(screen.getByTestId('prioritySelect')).toBeInTheDocument();
    expect(screen.getByTestId('categorySelect')).toBeInTheDocument();
    expect(screen.getByTestId('subcategorySelect')).toBeInTheDocument();
  });

  it('transforms the categories to options correctly', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(screen.getByRole('option', { name: 'Privilege Escalation' }));
    expect(screen.getByRole('option', { name: 'Criminal activity/investigation' }));
    expect(screen.getByRole('option', { name: 'Denial of Service' }));
    expect(screen.getByRole('option', { name: 'Software' }));
    expect(screen.getByRole('option', { name: 'Failed Login' }));
  });

  it('transforms the subcategories to options correctly', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(screen.getByRole('option', { name: 'Inbound or outbound' }));
    expect(screen.getByRole('option', { name: 'Single or distributed (DoS or DDoS)' }));
    expect(screen.getByRole('option', { name: 'Inbound DDos' }));
  });

  it('transforms the priorities to options correctly', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(screen.getByRole('option', { name: '1 - Critical' }));
    expect(screen.getByRole('option', { name: '2 - High' }));
    expect(screen.getByRole('option', { name: '3 - Moderate' }));
    expect(screen.getByRole('option', { name: '4 - Low' }));
  });

  it('shows the deprecated callout if the connector is deprecated', async () => {
    const tableApiConnector = { ...connector, isDeprecated: true };

    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={tableApiConnector} />
      </MockFormWrapperComponent>
    );

    expect(screen.getByTestId('deprecated-connector-warning-callout')).toBeInTheDocument();
  });

  it('does not show the deprecated callout when the connector is not deprecated', async () => {
    render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(screen.queryByTestId('deprecated-connector-warning-callout')).not.toBeInTheDocument();
  });

  it('does not show the deprecated callout when the connector is preconfigured and not deprecated', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={{ ...connector, isPreconfigured: true }} />
      </MockFormWrapperComponent>
    );

    expect(screen.queryByTestId('deprecated-connector-warning-callout')).not.toBeInTheDocument();
  });

  it('shows the deprecated callout when the connector is preconfigured and deprecated', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={{ ...connector, isPreconfigured: true, isDeprecated: true }} />
      </MockFormWrapperComponent>
    );

    expect(screen.queryByTestId('deprecated-connector-warning-callout')).toBeInTheDocument();
  });

  it('shows the subcategory if the selected category does not have subcategories', async () => {
    // Failed Login doesn't have defined subcategories
    const customFields = {
      ...fields,
      category: 'Failed Login',
      subcategory: '',
    };

    appMockRenderer.render(
      <MockFormWrapperComponent fields={customFields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(screen.getByTestId('subcategorySelect')).toBeInTheDocument();
    expect(screen.getByTestId('subcategorySelect')).not.toHaveValue();
  });

  describe('changing checkbox', () => {
    const checkboxes = ['destIp', 'sourceIp', 'malwareHash', 'malwareUrl'];

    checkboxes.forEach((subj) =>
      it(`${subj.toUpperCase()}`, async () => {
        appMockRenderer.render(
          <MockFormWrapperComponent fields={fields}>
            <Fields connector={connector} />
          </MockFormWrapperComponent>
        );

        const checkbox = screen.getByTestId(`${subj}Checkbox`);
        await user.click(checkbox);

        expect(checkbox).not.toBeChecked();
      })
    );

    const testers = ['priority'];

    testers.forEach((subj) =>
      it(`${subj.toUpperCase()}`, async () => {
        appMockRenderer.render(
          <MockFormWrapperComponent fields={fields}>
            <Fields connector={connector} />
          </MockFormWrapperComponent>
        );

        const select = screen.getByTestId(`${subj}Select`);
        await user.selectOptions(select, '4 - Low');

        expect(select).toHaveValue('4');
      })
    );
  });

  it('should submit servicenow sir connector', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    await user.click(screen.getByTestId('destIpCheckbox'));
    await user.selectOptions(screen.getByTestId('prioritySelect'), ['1']);
    await user.selectOptions(screen.getByTestId('categorySelect'), ['Denial of Service']);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Single or distributed (DoS or DDoS)' }));
    });

    await user.selectOptions(screen.getByTestId('subcategorySelect'), ['26']);

    expect(screen.getByTestId('destIpCheckbox')).not.toBeChecked();
    expect(screen.getByTestId('sourceIpCheckbox')).toBeChecked();
    expect(screen.getByTestId('malwareHashCheckbox')).toBeChecked();
    expect(screen.getByTestId('malwareUrlCheckbox')).toBeChecked();
    expect(screen.getByTestId('prioritySelect')).toHaveValue('1');
    expect(screen.getByTestId('categorySelect')).toHaveValue('Denial of Service');
    expect(screen.getByTestId('subcategorySelect')).toHaveValue('26');
  });

  it('resets subcategory when changing category', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    const categorySelect = screen.getByTestId('categorySelect');
    const subcategorySelect = screen.getByTestId('subcategorySelect');

    await user.selectOptions(categorySelect, ['Denial of Service']);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Single or distributed (DoS or DDoS)' }));
    });

    await user.selectOptions(subcategorySelect, ['26']);
    await user.selectOptions(categorySelect, ['Privilege Escalation']);

    await waitFor(() => {
      expect(subcategorySelect).not.toHaveValue();
    });
  });
});
