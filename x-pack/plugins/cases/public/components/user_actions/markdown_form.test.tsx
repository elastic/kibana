/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { useForm, Form } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { Content } from './schema';
import { schema } from './schema';
import { UserActionMarkdown } from './markdown_form';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer, TestProviders } from '../../common/mock';
import { waitFor, fireEvent, render, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
const onChangeEditable = jest.fn();
const onSaveContent = jest.fn();

const newValue = 'Hello from Tehas';
const emptyValue = '';
const hyperlink = `[hyperlink](http://elastic.co)`;
const draftStorageKey = `cases.testAppId.caseId.markdown-id.markdownEditor`;
const defaultProps = {
  content: `A link to a timeline ${hyperlink}`,
  id: 'markdown-id',
  caseId: 'caseId',
  isEditable: true,
  draftStorageKey,
  onChangeEditable,
  onSaveContent,
};

describe('UserActionMarkdown ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.removeItem(draftStorageKey);
  });

  it('Renders markdown correctly when not in edit mode', async () => {
    const wrapper = mount(
      <TestProviders>
        <UserActionMarkdown {...{ ...defaultProps, isEditable: false }} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="markdown-link"]`).first().text()).toContain('hyperlink');
  });

  it('Save button click calls onSaveContent and onChangeEditable when text area value changed', async () => {
    const wrapper = mount(
      <TestProviders>
        <UserActionMarkdown {...defaultProps} />
      </TestProviders>
    );

    wrapper
      .find(`.euiMarkdownEditorTextArea`)
      .first()
      .simulate('change', {
        target: { value: newValue },
      });

    wrapper.find(`button[data-test-subj="user-action-save-markdown"]`).first().simulate('click');

    await waitFor(() => {
      expect(onSaveContent).toHaveBeenCalledWith(newValue);
      expect(onChangeEditable).toHaveBeenCalledWith(defaultProps.id);
    });
  });

  it('Does not call onSaveContent if no change from current text', async () => {
    const wrapper = mount(
      <TestProviders>
        <UserActionMarkdown {...defaultProps} />
      </TestProviders>
    );

    wrapper.find(`button[data-test-subj="user-action-save-markdown"]`).first().simulate('click');

    await waitFor(() => {
      expect(onChangeEditable).toHaveBeenCalledWith(defaultProps.id);
    });
    expect(onSaveContent).not.toHaveBeenCalled();
  });

  it('Save button disabled if current text is empty', async () => {
    const wrapper = mount(
      <TestProviders>
        <UserActionMarkdown {...defaultProps} />
      </TestProviders>
    );

    wrapper
      .find(`.euiMarkdownEditorTextArea`)
      .first()
      .simulate('change', {
        target: { value: emptyValue },
      });

    await waitFor(() => {
      expect(
        wrapper.find(`button[data-test-subj="user-action-save-markdown"]`).first().prop('disabled')
      ).toBeTruthy();
    });
  });

  it('Cancel button click calls only onChangeEditable', async () => {
    const wrapper = mount(
      <TestProviders>
        <UserActionMarkdown {...defaultProps} />
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="user-action-cancel-markdown"]`).first().simulate('click');

    await waitFor(() => {
      expect(onSaveContent).not.toHaveBeenCalled();
      expect(onChangeEditable).toHaveBeenCalledWith(defaultProps.id);
    });
  });

  describe('useForm stale state bug', () => {
    let appMockRenderer: AppMockRenderer;
    const oldContent = defaultProps.content;
    const appendContent = ' appended content';
    const newContent = defaultProps.content + appendContent;

    beforeEach(() => {
      appMockRenderer = createAppMockRenderer();
    });

    it('creates a stale state if a key is not passed to the component', async () => {
      const TestComponent = () => {
        const [isEditable, setIsEditable] = React.useState(true);
        const [saveContent, setSaveContent] = React.useState(defaultProps.content);
        return (
          <div>
            <UserActionMarkdown
              // note that this is not passing the key
              {...defaultProps}
              content={saveContent}
              onSaveContent={setSaveContent}
              isEditable={isEditable}
            />
            <button
              type="button"
              data-test-subj="test-button"
              onClick={() => {
                setIsEditable(!isEditable);
              }}
            />
          </div>
        );
      };

      const result = appMockRenderer.render(<TestComponent />);

      expect(result.getByTestId('user-action-markdown-form')).toBeTruthy();

      // append some content and save
      userEvent.type(result.container.querySelector('textarea')!, appendContent);
      userEvent.click(result.getByTestId('user-action-save-markdown'));

      // wait for the state to update
      await waitFor(() => {
        expect(onChangeEditable).toHaveBeenCalledWith(defaultProps.id);
      });

      // toggle to non-edit state
      userEvent.click(result.getByTestId('test-button'));
      expect(result.getByTestId('user-action-markdown')).toBeTruthy();

      // toggle to edit state again
      userEvent.click(result.getByTestId('test-button'));

      // the text area holds a stale value
      // this is the wrong behaviour. The textarea holds the old content
      expect(result.container.querySelector('textarea')!.value).toEqual(oldContent);
      expect(result.container.querySelector('textarea')!.value).not.toEqual(newContent);
    });

    it("doesn't create a stale state if a key is passed to the component", async () => {
      const TestComponent = () => {
        const [isEditable, setIsEditable] = React.useState(true);
        const [saveContent, setSaveContent] = React.useState(defaultProps.content);
        return (
          <div>
            <UserActionMarkdown
              {...defaultProps}
              content={saveContent}
              isEditable={isEditable}
              onSaveContent={setSaveContent}
              // this is the important change. a key is passed to the component
              key={isEditable ? 'key' : 'no-key'}
            />
            <button
              type="button"
              data-test-subj="test-button"
              onClick={() => {
                setIsEditable(!isEditable);
              }}
            />
          </div>
        );
      };
      const result = appMockRenderer.render(<TestComponent />);
      expect(result.getByTestId('user-action-markdown-form')).toBeTruthy();

      // append content and save
      userEvent.type(result.container.querySelector('textarea')!, appendContent);
      userEvent.click(result.getByTestId('user-action-save-markdown'));

      // wait for the state to update
      await waitFor(() => {
        expect(onChangeEditable).toHaveBeenCalledWith(defaultProps.id);
      });

      // toggle to non-edit state
      userEvent.click(result.getByTestId('test-button'));
      expect(result.getByTestId('user-action-markdown')).toBeTruthy();

      // toggle to edit state again
      userEvent.click(result.getByTestId('test-button'));

      // this is the correct behaviour. The textarea holds the new content
      expect(result.container.querySelector('textarea')!.value).toEqual(newContent);
      expect(result.container.querySelector('textarea')!.value).not.toEqual(oldContent);
    });
  });

  describe('draft comment ', () => {
    const content = 'test content';
    const initialState = { content };
    const MockHookWrapperComponent: React.FC<{ testProviderProps?: unknown }> = ({
      children,
      testProviderProps = {},
    }) => {
      const { form } = useForm<Content>({
        defaultValue: initialState,
        options: { stripEmptyFields: false },
        schema,
      });

      return (
        <TestProviders {...testProviderProps}>
          <Form form={form}>{children}</Form>
        </TestProviders>
      );
    };

    beforeAll(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.clearAllTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
      sessionStorage.removeItem(draftStorageKey);
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('Save button click clears session storage', async () => {
      const result = render(
        <MockHookWrapperComponent>
          <UserActionMarkdown {...defaultProps} />
        </MockHookWrapperComponent>
      );

      fireEvent.change(result.getByTestId('euiMarkdownEditorTextArea'), {
        target: { value: newValue },
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(sessionStorage.getItem(draftStorageKey)).toBe(newValue);

      fireEvent.click(result.getByTestId(`user-action-save-markdown`));

      await waitFor(() => {
        expect(onSaveContent).toHaveBeenCalledWith(newValue);
        expect(onChangeEditable).toHaveBeenCalledWith(defaultProps.id);
        expect(sessionStorage.getItem(draftStorageKey)).toBe(null);
      });
    });

    it('Cancel button click clears session storage', async () => {
      const result = render(
        <MockHookWrapperComponent>
          <UserActionMarkdown {...defaultProps} />
        </MockHookWrapperComponent>
      );

      expect(sessionStorage.getItem(draftStorageKey)).toBe('');

      fireEvent.change(result.getByTestId('euiMarkdownEditorTextArea'), {
        target: { value: newValue },
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(sessionStorage.getItem(draftStorageKey)).toBe(newValue);
      });

      fireEvent.click(result.getByTestId('user-action-cancel-markdown'));

      await waitFor(() => {
        expect(sessionStorage.getItem(draftStorageKey)).toBe(null);
      });
    });

    describe('existing storage key', () => {
      beforeEach(() => {
        sessionStorage.setItem(draftStorageKey, 'value set in storage');
      });

      it('should have session storage value same as draft comment', async () => {
        const result = render(
          <MockHookWrapperComponent>
            <UserActionMarkdown {...defaultProps} />
          </MockHookWrapperComponent>
        );

        expect(result.getByText('value set in storage')).toBeInTheDocument();
      });
    });
  });
});
