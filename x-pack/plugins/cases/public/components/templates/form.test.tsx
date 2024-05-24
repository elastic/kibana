/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen, waitFor, within } from '@testing-library/react';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import type { TemplateFormState } from './form';
import { TemplateForm } from './form';
import { connectorsMock, customFieldsConfigurationMock } from '../../containers/mock';
import userEvent from '@testing-library/user-event';
import { useGetChoices } from '../connectors/servicenow/use_get_choices';
import { useGetChoicesResponse } from '../create/mock';
import { MAX_TAGS_PER_TEMPLATE, MAX_TEMPLATE_TAG_LENGTH } from '../../../common/constants';

jest.mock('../connectors/servicenow/use_get_choices');

const useGetChoicesMock = useGetChoices as jest.Mock;

describe('TemplateForm', () => {
  let appMockRenderer: AppMockRenderer;
  const defaultProps = {
    connectors: connectorsMock,
    configurationConnectorId: 'none',
    configurationCustomFields: [],
    onChange: jest.fn(),
    initialValue: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
    useGetChoicesMock.mockReturnValue(useGetChoicesResponse);
  });

  it('renders correctly', async () => {
    appMockRenderer.render(<TemplateForm {...defaultProps} />);

    expect(await screen.findByTestId('template-creation-form-steps')).toBeInTheDocument();
  });

  it('renders all default fields', async () => {
    appMockRenderer.render(<TemplateForm {...defaultProps} />);

    expect(await screen.findByTestId('template-name-input')).toBeInTheDocument();
    expect(await screen.findByTestId('template-description-input')).toBeInTheDocument();
    expect(await screen.findByTestId('case-form-fields')).toBeInTheDocument();
    expect(await screen.findByTestId('caseTitle')).toBeInTheDocument();
    expect(await screen.findByTestId('caseTags')).toBeInTheDocument();
    expect(await screen.findByTestId('caseCategory')).toBeInTheDocument();
    expect(await screen.findByTestId('caseSeverity')).toBeInTheDocument();
    expect(await screen.findByTestId('caseDescription')).toBeInTheDocument();
    expect(await screen.findByTestId('caseConnectors')).toBeInTheDocument();
  });

  it('renders all fields as per initialValue', async () => {
    const newProps = {
      ...defaultProps,
      initialValue: {
        key: 'template_key_1',
        name: 'Template 1',
        description: 'Sample description',
        caseFields: null,
      },
    };
    appMockRenderer.render(<TemplateForm {...newProps} />);

    expect(await screen.findByTestId('template-name-input')).toHaveValue('Template 1');
    expect(await screen.findByTestId('template-description-input')).toHaveValue(
      'Sample description'
    );
    expect(await screen.findByTestId('case-form-fields')).toBeInTheDocument();
    expect(await screen.findByTestId('caseTitle')).toBeInTheDocument();
    expect(await screen.findByTestId('caseTags')).toBeInTheDocument();
    expect(await screen.findByTestId('caseCategory')).toBeInTheDocument();
    expect(await screen.findByTestId('caseSeverity')).toBeInTheDocument();
    expect(await screen.findByTestId('caseDescription')).toBeInTheDocument();
    expect(await screen.findByTestId('caseConnectors')).toBeInTheDocument();
  });

  it('renders case fields as per initialValue', async () => {
    const newProps = {
      ...defaultProps,
      initialValue: {
        key: 'template_key_1',
        name: 'Template 1',
        description: 'Sample description',
        caseFields: {
          title: 'Case with template 1',
          description: 'case description',
        },
      },
    };
    appMockRenderer.render(<TemplateForm {...newProps} />);

    expect(await within(await screen.findByTestId('caseTitle')).findByTestId('input')).toHaveValue(
      'Case with template 1'
    );
    expect(
      await within(await screen.findByTestId('caseDescription')).findByTestId(
        'euiMarkdownEditorTextArea'
      )
    ).toHaveValue('case description');
  });

  it('serializes the template field data correctly', async () => {
    let formState: TemplateFormState;

    const onChangeState = (state: TemplateFormState) => (formState = state);

    appMockRenderer.render(<TemplateForm {...{ ...defaultProps, onChange: onChangeState }} />);

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    userEvent.paste(await screen.findByTestId('template-name-input'), 'Template 1');

    userEvent.paste(
      await screen.findByTestId('template-description-input'),
      'this is a first template'
    );

    const templateTags = await screen.findByTestId('template-tags');

    userEvent.paste(within(templateTags).getByRole('combobox'), 'foo');
    userEvent.keyboard('{enter}');
    userEvent.paste(within(templateTags).getByRole('combobox'), 'bar');
    userEvent.keyboard('{enter}');

    await act(async () => {
      const { data, isValid } = await formState!.submit();

      expect(isValid).toBe(true);

      expect(data).toEqual({
        key: expect.anything(),
        name: 'Template 1',
        description: 'this is a first template',
        tags: ['foo', 'bar'],
        caseFields: {
          connectorId: 'none',
          fields: null,
          syncAlerts: true,
        },
      });
    });
  });

  it('serializes the case field data correctly', async () => {
    let formState: TemplateFormState;

    const onChangeState = (state: TemplateFormState) => (formState = state);

    appMockRenderer.render(<TemplateForm {...{ ...defaultProps, onChange: onChangeState }} />);

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    userEvent.paste(await screen.findByTestId('template-name-input'), 'Template 1');

    userEvent.paste(
      await screen.findByTestId('template-description-input'),
      'this is a first template'
    );

    const caseTitle = await screen.findByTestId('caseTitle');
    userEvent.paste(within(caseTitle).getByTestId('input'), 'Case with Template 1');

    const caseDescription = await screen.findByTestId('caseDescription');
    userEvent.paste(
      within(caseDescription).getByTestId('euiMarkdownEditorTextArea'),
      'This is a case description'
    );

    const caseTags = await screen.findByTestId('caseTags');
    userEvent.paste(within(caseTags).getByRole('combobox'), 'template-1');
    userEvent.keyboard('{enter}');

    const caseCategory = await screen.findByTestId('caseCategory');
    userEvent.type(within(caseCategory).getByRole('combobox'), 'new {enter}');

    await act(async () => {
      const { data, isValid } = await formState!.submit();

      expect(isValid).toBe(true);

      expect(data).toEqual({
        key: expect.anything(),
        name: 'Template 1',
        description: 'this is a first template',
        tags: [],
        caseFields: {
          title: 'Case with Template 1',
          description: 'This is a case description',
          tags: ['template-1'],
          category: 'new',
          connectorId: 'none',
          fields: null,
          syncAlerts: true,
        },
      });
    });
  });

  it('serializes the connector fields data correctly', async () => {
    let formState: TemplateFormState;

    const onChangeState = (state: TemplateFormState) => (formState = state);

    appMockRenderer.render(
      <TemplateForm
        {...{ ...defaultProps, configurationConnectorId: 'servicenow-1', onChange: onChangeState }}
      />
    );

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    userEvent.paste(await screen.findByTestId('template-name-input'), 'Template 1');

    userEvent.paste(
      await screen.findByTestId('template-description-input'),
      'this is a first template'
    );

    expect(await screen.findByTestId('connector-fields-sn-itsm')).toBeInTheDocument();

    userEvent.selectOptions(await screen.findByTestId('urgencySelect'), '1');

    userEvent.selectOptions(await screen.findByTestId('categorySelect'), ['software']);

    await act(async () => {
      const { data, isValid } = await formState!.submit();

      expect(isValid).toBe(true);

      expect(data).toEqual({
        key: expect.anything(),
        name: 'Template 1',
        description: 'this is a first template',
        tags: [],
        caseFields: {
          connectorId: 'servicenow-1',
          fields: {
            category: 'software',
            impact: null,
            severity: null,
            subcategory: null,
            urgency: '1',
          },
          syncAlerts: true,
        },
      });
    });
  });

  it('serializes the custom fields data correctly', async () => {
    let formState: TemplateFormState;

    const onChangeState = (state: TemplateFormState) => (formState = state);

    appMockRenderer.render(
      <TemplateForm
        {...{
          ...defaultProps,
          configurationCustomFields: customFieldsConfigurationMock,
          onChange: onChangeState,
        }}
      />
    );

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    userEvent.paste(await screen.findByTestId('template-name-input'), 'Template 1');

    userEvent.paste(
      await screen.findByTestId('template-description-input'),
      'this is a first template'
    );

    const textField = customFieldsConfigurationMock[0];
    const toggleField = customFieldsConfigurationMock[3];

    const textCustomField = await screen.findByTestId(
      `${textField.key}-${textField.type}-create-custom-field`
    );

    userEvent.clear(textCustomField);
    userEvent.paste(textCustomField, 'My text test value 1');

    userEvent.click(
      await screen.findByTestId(`${toggleField.key}-${toggleField.type}-create-custom-field`)
    );

    await act(async () => {
      const { data, isValid } = await formState!.submit();

      expect(isValid).toBe(true);

      expect(data).toEqual({
        key: expect.anything(),
        name: 'Template 1',
        description: 'this is a first template',
        tags: [],
        caseFields: {
          connectorId: 'none',
          fields: null,
          syncAlerts: true,
          customFields: {
            test_key_1: 'My text test value 1',
            test_key_2: true,
            test_key_4: true,
          },
        },
      });
    });
  });

  it('shows from state as invalid when template name missing', async () => {
    let formState: TemplateFormState;

    const onChangeState = (state: TemplateFormState) => (formState = state);

    appMockRenderer.render(<TemplateForm {...{ ...defaultProps, onChange: onChangeState }} />);

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    userEvent.paste(await screen.findByTestId('template-name-input'), '');

    await act(async () => {
      const { data, isValid } = await formState!.submit();

      expect(isValid).toBe(false);

      expect(data).toEqual({});
    });
  });

  it('shows from state as invalid when template description missing', async () => {
    let formState: TemplateFormState;

    const onChangeState = (state: TemplateFormState) => (formState = state);

    appMockRenderer.render(<TemplateForm {...{ ...defaultProps, onChange: onChangeState }} />);

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    userEvent.paste(await screen.findByTestId('template-name-input'), 'Template 1');

    await act(async () => {
      const { data, isValid } = await formState!.submit();

      expect(isValid).toBe(false);

      expect(data).toEqual({});
    });
  });

  it('shows from state as invalid when template tags are more than 10', async () => {
    let formState: TemplateFormState;

    const onChangeState = (state: TemplateFormState) => (formState = state);

    appMockRenderer.render(<TemplateForm {...{ ...defaultProps, onChange: onChangeState }} />);

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    const tagsArray = Array(MAX_TAGS_PER_TEMPLATE + 1).fill('foo');

    const templateTags = await screen.findByTestId('template-tags');

    tagsArray.forEach((tag) => {
      userEvent.paste(within(templateTags).getByRole('combobox'), 'template-1');
      userEvent.keyboard('{enter}');
    });

    await act(async () => {
      const { data, isValid } = await formState!.submit();

      expect(isValid).toBe(false);

      expect(data).toEqual({});
    });
  });

  it('shows from state as invalid when template tag is more than 50 characters', async () => {
    let formState: TemplateFormState;

    const onChangeState = (state: TemplateFormState) => (formState = state);

    appMockRenderer.render(<TemplateForm {...{ ...defaultProps, onChange: onChangeState }} />);

    await waitFor(() => {
      expect(formState).not.toBeUndefined();
    });

    const x = 'a'.repeat(MAX_TEMPLATE_TAG_LENGTH + 1);

    const templateTags = await screen.findByTestId('template-tags');

    userEvent.paste(within(templateTags).getByRole('combobox'), x);
    userEvent.keyboard('{enter}');

    await act(async () => {
      const { data, isValid } = await formState!.submit();

      expect(isValid).toBe(false);

      expect(data).toEqual({});
    });
  });
});
