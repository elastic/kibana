/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { FormTestComponent } from '../../common/test_utils';
import { customFieldsConfigurationMock } from '../../containers/mock';
import { userProfiles } from '../../containers/user_profiles/api.mock';

import { CaseFormFields } from '.';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

jest.mock('../../containers/user_profiles/api');

describe('CaseFormFields', () => {
  let appMock: AppMockRenderer;
  const onSubmit = jest.fn();
  const formDefaultValue = { tags: [] };
  const defaultProps = {
    isLoading: false,
    configurationCustomFields: [],
  };

  beforeEach(() => {
    appMock = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    appMock.render(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <CaseFormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('case-form-fields')).toBeInTheDocument();
  });

  it('renders case fields correctly', async () => {
    appMock.render(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <CaseFormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseTitle')).toBeInTheDocument();
    expect(await screen.findByTestId('caseTags')).toBeInTheDocument();
    expect(await screen.findByTestId('caseCategory')).toBeInTheDocument();
    expect(await screen.findByTestId('caseSeverity')).toBeInTheDocument();
    expect(await screen.findByTestId('caseDescription')).toBeInTheDocument();
  });

  it('does not render customFields when empty', () => {
    appMock.render(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <CaseFormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(screen.queryByTestId('caseCustomFields')).not.toBeInTheDocument();
  });

  it('renders customFields when not empty', async () => {
    appMock.render(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <CaseFormFields
          isLoading={false}
          configurationCustomFields={customFieldsConfigurationMock}
        />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseCustomFields')).toBeInTheDocument();
  });

  it('does not render assignees when no platinum license', () => {
    appMock.render(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <CaseFormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(screen.queryByTestId('createCaseAssigneesComboBox')).not.toBeInTheDocument();
  });

  it('renders assignees when platinum license', async () => {
    const license = licensingMock.createLicense({
      license: { type: 'platinum' },
    });

    appMock = createAppMockRenderer({ license });

    appMock.render(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <CaseFormFields {...defaultProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('createCaseAssigneesComboBox')).toBeInTheDocument();
  });

  it('calls onSubmit with case fields', async () => {
    appMock.render(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <CaseFormFields {...defaultProps} />
      </FormTestComponent>
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

    userEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith(
        {
          category: 'new',
          tags: ['template-1'],
          description: 'This is a case description',
          title: 'Case with Template 1',
        },
        true
      );
    });
  });

  it('calls onSubmit with existing case fields', async () => {
    appMock.render(
      <FormTestComponent
        formDefaultValue={{
          title: 'Case with Template 1',
          description: 'This is a case description',
          tags: ['case-tag-1', 'case-tag-2'],
          category: null,
        }}
        onSubmit={onSubmit}
      >
        <CaseFormFields {...defaultProps} />
      </FormTestComponent>
    );

    userEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith(
        {
          category: null,
          tags: ['case-tag-1', 'case-tag-2'],
          description: 'This is a case description',
          title: 'Case with Template 1',
        },
        true
      );
    });
  });

  it('calls onSubmit with custom fields', async () => {
    const newProps = {
      ...defaultProps,
      configurationCustomFields: customFieldsConfigurationMock,
    };

    appMock.render(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <CaseFormFields {...newProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseCustomFields')).toBeInTheDocument();

    const textField = customFieldsConfigurationMock[0];
    const toggleField = customFieldsConfigurationMock[1];

    const textCustomField = await screen.findByTestId(
      `${textField.key}-${textField.type}-create-custom-field`
    );

    userEvent.clear(textCustomField);
    userEvent.paste(textCustomField, 'My text test value 1');

    userEvent.click(
      await screen.findByTestId(`${toggleField.key}-${toggleField.type}-create-custom-field`)
    );

    userEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith(
        {
          category: null,
          tags: [],
          customFields: {
            test_key_1: 'My text test value 1',
            test_key_2: false,
            test_key_4: false,
          },
        },
        true
      );
    });
  });

  it('calls onSubmit with existing custom fields', async () => {
    const newProps = {
      ...defaultProps,
      configurationCustomFields: customFieldsConfigurationMock,
    };

    appMock.render(
      <FormTestComponent
        formDefaultValue={{
          customFields: { [customFieldsConfigurationMock[0].key]: 'Test custom filed value' },
          tags: [],
        }}
        onSubmit={onSubmit}
      >
        <CaseFormFields {...newProps} />
      </FormTestComponent>
    );

    expect(await screen.findByTestId('caseCustomFields')).toBeInTheDocument();

    userEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith(
        {
          category: null,
          tags: [],
          customFields: {
            test_key_1: 'Test custom filed value',
            test_key_2: true,
            test_key_4: false,
          },
        },
        true
      );
    });
  });

  it('calls onSubmit with assignees', async () => {
    const license = licensingMock.createLicense({
      license: { type: 'platinum' },
    });

    appMock = createAppMockRenderer({ license });

    appMock.render(
      <FormTestComponent formDefaultValue={formDefaultValue} onSubmit={onSubmit}>
        <CaseFormFields {...defaultProps} />
      </FormTestComponent>
    );

    const assigneesComboBox = await screen.findByTestId('createCaseAssigneesComboBox');

    userEvent.click(await within(assigneesComboBox).findByTestId('comboBoxToggleListButton'));

    await waitForEuiPopoverOpen();

    userEvent.click(screen.getByText(`${userProfiles[0].user.full_name}`));

    userEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith(
        {
          category: null,
          tags: [],
          assignees: [{ uid: userProfiles[0].uid }],
        },
        true
      );
    });
  });

  it('calls onSubmit with existing assignees', async () => {
    const license = licensingMock.createLicense({
      license: { type: 'platinum' },
    });

    appMock = createAppMockRenderer({ license });

    appMock.render(
      <FormTestComponent
        formDefaultValue={{
          assignees: [{ uid: userProfiles[1].uid }],
          tags: [],
        }}
        onSubmit={onSubmit}
      >
        <CaseFormFields {...defaultProps} />
      </FormTestComponent>
    );

    userEvent.click(await screen.findByText('Submit'));

    await waitFor(() => {
      expect(onSubmit).toBeCalledWith(
        {
          category: null,
          tags: [],
          assignees: [{ uid: userProfiles[1].uid }],
        },
        true
      );
    });
  });
});
