/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useGetChoices } from './use_get_choices';
import { connector, choices } from '../mock';
import Fields from './servicenow_sir_case_fields';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { MockFormWrapperComponent } from '../test_utils';

jest.mock('../../../common/lib/kibana');
jest.mock('./use_get_choices');
const useGetChoicesMock = useGetChoices as jest.Mock;

let appMockRenderer: AppMockRenderer;

describe('ServiceNowSIR Fields', () => {
  const fields = {
    destIp: true,
    sourceIp: true,
    malwareHash: true,
    malwareUrl: true,
    priority: '1',
    category: 'Denial of Service',
    subcategory: '26',
  };

  beforeEach(() => {
    appMockRenderer = createAppMockRenderer();
    useGetChoicesMock.mockReturnValue({
      isLoading: false,
      isFetching: false,
      data: { data: choices },
    });
    jest.clearAllMocks();
  });

  it('all params fields are rendered', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(await screen.findByTestId('destIpCheckbox')).toBeInTheDocument();
    expect(await screen.findByTestId('sourceIpCheckbox')).toBeInTheDocument();
    expect(await screen.findByTestId('malwareUrlCheckbox')).toBeInTheDocument();
    expect(await screen.findByTestId('malwareHashCheckbox')).toBeInTheDocument();
    expect(await screen.findByTestId('prioritySelect')).toBeInTheDocument();
    expect(await screen.findByTestId('categorySelect')).toBeInTheDocument();
    expect(await screen.findByTestId('subcategorySelect')).toBeInTheDocument();
  });

  it('transforms the categories to options correctly', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(await screen.findByRole('option', { name: 'Privilege Escalation' }));
    expect(await screen.findByRole('option', { name: 'Criminal activity/investigation' }));
    expect(await screen.findByRole('option', { name: 'Denial of Service' }));
    expect(await screen.findByRole('option', { name: 'Software' }));
    expect(await screen.findByRole('option', { name: 'Failed Login' }));
  });

  it('transforms the subcategories to options correctly', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(await screen.findByRole('option', { name: 'Inbound or outbound' }));
    expect(await screen.findByRole('option', { name: 'Single or distributed (DoS or DDoS)' }));
    expect(await screen.findByRole('option', { name: 'Inbound DDos' }));
  });

  it('transforms the priorities to options correctly', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    expect(await screen.findByRole('option', { name: '1 - Critical' }));
    expect(await screen.findByRole('option', { name: '2 - High' }));
    expect(await screen.findByRole('option', { name: '3 - Moderate' }));
    expect(await screen.findByRole('option', { name: '4 - Low' }));
  });

  it('shows the deprecated callout if the connector is deprecated', async () => {
    const tableApiConnector = { ...connector, isDeprecated: true };

    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={tableApiConnector} />
      </MockFormWrapperComponent>
    );

    expect(await screen.findByTestId('deprecated-connector-warning-callout')).toBeInTheDocument();
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

    expect(await screen.findByTestId('subcategorySelect')).toBeInTheDocument();
    expect(await screen.findByTestId('subcategorySelect')).not.toHaveValue();
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

        const checkbox = await screen.findByTestId(`${subj}Checkbox`);
        userEvent.click(checkbox);

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

        const select = await screen.findByTestId(`${subj}Select`);
        userEvent.selectOptions(select, '4 - Low');

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

    userEvent.click(await screen.findByTestId('destIpCheckbox'));
    userEvent.selectOptions(await screen.findByTestId('prioritySelect'), ['1']);
    userEvent.selectOptions(await screen.findByTestId('categorySelect'), ['Denial of Service']);

    expect(await screen.findByRole('option', { name: 'Single or distributed (DoS or DDoS)' }));

    userEvent.selectOptions(await screen.findByTestId('subcategorySelect'), ['26']);

    expect(await screen.findByTestId('destIpCheckbox')).not.toBeChecked();
    expect(await screen.findByTestId('sourceIpCheckbox')).toBeChecked();
    expect(await screen.findByTestId('malwareHashCheckbox')).toBeChecked();
    expect(await screen.findByTestId('malwareUrlCheckbox')).toBeChecked();
    expect(await screen.findByTestId('prioritySelect')).toHaveValue('1');
    expect(await screen.findByTestId('categorySelect')).toHaveValue('Denial of Service');
    expect(await screen.findByTestId('subcategorySelect')).toHaveValue('26');
  });

  it('resets subcategory when changing category', async () => {
    appMockRenderer.render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );

    const categorySelect = await screen.findByTestId('categorySelect');
    const subcategorySelect = await screen.findByTestId('subcategorySelect');

    userEvent.selectOptions(categorySelect, ['Denial of Service']);

    expect(await screen.findByRole('option', { name: 'Single or distributed (DoS or DDoS)' }));

    userEvent.selectOptions(subcategorySelect, ['26']);
    userEvent.selectOptions(categorySelect, ['Privilege Escalation']);

    await waitFor(() => {
      expect(subcategorySelect).not.toHaveValue();
    });
  });
});
