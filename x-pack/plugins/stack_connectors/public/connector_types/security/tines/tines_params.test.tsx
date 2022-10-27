/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { MockCodeEditor } from '@kbn/triggers-actions-ui-plugin/public/application/code_editor.mock';
import type { UseSubActionParams } from '@kbn/triggers-actions-ui-plugin/public/application/hooks/use_sub_action';
import TinesParamsFields from './tines_params';

const kibanaReactPath = '@kbn/kibana-react-plugin/public';
const triggersActionsPath = '@kbn/triggers-actions-ui-plugin/public';
interface Result {
  isLoading: boolean;
  response: unknown[];
  error: null | Error;
}
const mockUseSubActionStories = jest.fn<Result, [UseSubActionParams<unknown>]>(() => ({
  isLoading: false,
  response: [story],
  error: null,
}));
const mockUseSubActionWebhooks = jest.fn<Result, [UseSubActionParams<unknown>]>(() => ({
  isLoading: false,
  response: [webhook],
  error: null,
}));
const mockUseSubAction = jest.fn<Result, [UseSubActionParams<unknown>]>((params) =>
  params.subAction === 'stories'
    ? mockUseSubActionStories(params)
    : mockUseSubActionWebhooks(params)
);

const mockToasts = { danger: jest.fn(), warning: jest.fn() };
jest.mock(triggersActionsPath, () => {
  const original = jest.requireActual(triggersActionsPath);
  return {
    ...original,
    useSubAction: (params: UseSubActionParams<unknown>) => mockUseSubAction(params),
    useKibana: () => ({
      ...original.useKibana(),
      notifications: { toasts: mockToasts },
    }),
  };
});

jest.mock(kibanaReactPath, () => {
  const original = jest.requireActual(kibanaReactPath);
  return {
    ...original,
    CodeEditor: (props: any) => {
      return <MockCodeEditor {...props} />;
    },
  };
});

const mockEditAction = jest.fn();
const index = 0;
const webhook = {
  id: 1234,
  storyId: 5678,
  name: 'test webhook',
  path: 'somePath',
  secret: 'someSecret',
};
const story = { id: webhook.storyId, name: 'test story' };
const actionParams = { subActionParams: { webhook } };
const emptyErrors = { subAction: [], subActionParams: [] };
const messageVariables = [
  {
    name: 'myVar',
    description: 'My variable description',
    useWithTripleBracesInTemplates: true,
  },
];

describe('TinesParamsFields renders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('New connector', () => {
    it('should render empty run form', () => {
      const wrapper = mountWithIntl(
        <TinesParamsFields
          actionParams={{}}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          messageVariables={messageVariables}
        />
      );

      expect(wrapper.find('[data-test-subj="tines-bodyJsonEditor"]').exists()).toBe(false);

      expect(wrapper.find('[data-test-subj="tines-storySelector"]').exists()).toBe(true);
      expect(wrapper.find('[data-test-subj="tines-storySelector"]').first().text()).toBe(
        'Select a Tines story'
      );
      expect(wrapper.find('[data-test-subj="tines-webhookSelector"]').exists()).toBe(true);
      expect(wrapper.find('[data-test-subj="tines-webhookSelector"]').first().text()).toBe(
        'Select a story first'
      );

      expect(mockEditAction).toHaveBeenCalledWith('subAction', 'run', index);
    });

    it('should render empty test form', () => {
      const wrapper = mountWithIntl(
        <TinesParamsFields
          actionParams={{}}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
        />
      );

      expect(wrapper.find('[data-test-subj="tines-bodyJsonEditor"]').exists()).toBe(true);
      expect(wrapper.find('[data-test-subj="bodyAddVariableButton"]').exists()).toBe(false);

      expect(wrapper.find('[data-test-subj="tines-storySelector"]').exists()).toBe(true);
      expect(wrapper.find('[data-test-subj="tines-storySelector"]').first().text()).toBe(
        'Select a Tines story'
      );
      expect(wrapper.find('[data-test-subj="tines-webhookSelector"]').exists()).toBe(true);
      expect(wrapper.find('[data-test-subj="tines-webhookSelector"]').first().text()).toBe(
        'Select a story first'
      );

      expect(mockEditAction).toHaveBeenCalledWith('subAction', 'test', index);
    });

    it('should call useSubAction with empty form', () => {
      mountWithIntl(
        <TinesParamsFields
          actionParams={{}}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          messageVariables={messageVariables}
        />
      );
      expect(mockUseSubAction).toHaveBeenCalledTimes(2);
      expect(mockUseSubActionStories).toHaveBeenCalledWith(
        expect.objectContaining({ subAction: 'stories' })
      );
      expect(mockUseSubActionWebhooks).toHaveBeenCalledWith(
        expect.objectContaining({ subAction: 'webhooks', disabled: true })
      );
    });

    it('should render with story selectable and webhook selector disabled', () => {
      const wrapper = mountWithIntl(
        <TinesParamsFields
          actionParams={{}}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          messageVariables={messageVariables}
        />
      );
      wrapper
        .find('[data-test-subj="tines-storySelector"] [data-test-subj="comboBoxToggleListButton"]')
        .first()
        .simulate('click');

      expect(wrapper.find('[data-test-subj="tines-storySelector-optionsList"]').exists()).toBe(
        true
      );
      expect(wrapper.find('[data-test-subj="tines-storySelector-optionsList"]').text()).toBe(
        story.name
      );
      expect(
        wrapper.find('[data-test-subj="tines-webhookSelector"]').first().prop('disabled')
      ).toBe(true);
    });

    it('should enable with webhook selector when story selected', () => {
      const wrapper = mountWithIntl(
        <TinesParamsFields
          actionParams={{}}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          messageVariables={messageVariables}
        />
      );
      wrapper
        .find('[data-test-subj="tines-storySelector"] [data-test-subj="comboBoxToggleListButton"]')
        .first()
        .simulate('click');
      wrapper
        .find('[data-test-subj="tines-storySelector-optionsList"] button')
        .first()
        .simulate('click');

      expect(
        wrapper.find('[data-test-subj="tines-webhookSelector"]').first().prop('disabled')
      ).toBe(false);
      expect(wrapper.find('[data-test-subj="tines-webhookSelector"]').first().text()).toBe(
        'Select a webhook action'
      );
      wrapper
        .find(
          '[data-test-subj="tines-webhookSelector"] [data-test-subj="comboBoxToggleListButton"]'
        )
        .first()
        .simulate('click');

      expect(wrapper.find('[data-test-subj="tines-webhookSelector-optionsList"]').text()).toBe(
        webhook.name
      );
    });

    it('should set form values when selected', () => {
      const wrapper = mountWithIntl(
        <TinesParamsFields
          actionParams={{}}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          messageVariables={messageVariables}
        />
      );
      wrapper
        .find('[data-test-subj="tines-storySelector"] [data-test-subj="comboBoxToggleListButton"]')
        .first()
        .simulate('click');
      wrapper
        .find('[data-test-subj="tines-storySelector-optionsList"] button')
        .first()
        .simulate('click');

      expect(mockEditAction).toHaveBeenCalledWith(
        'subActionParams',
        { webhook: { storyId: story.id } },
        index
      );

      wrapper
        .find(
          '[data-test-subj="tines-webhookSelector"] [data-test-subj="comboBoxToggleListButton"]'
        )
        .first()
        .simulate('click');
      wrapper
        .find('[data-test-subj="tines-webhookSelector-optionsList"] button')
        .first()
        .simulate('click');

      expect(mockEditAction).toHaveBeenCalledWith('subActionParams', { webhook }, index);
    });
  });

  describe('Edit connector', () => {
    it('should render form values', () => {
      const wrapper = mountWithIntl(
        <TinesParamsFields
          actionParams={actionParams}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          messageVariables={messageVariables}
        />
      );

      expect(wrapper.find('[data-test-subj="tines-bodyJsonEditor"]').exists()).toBe(false);
      expect(wrapper.find('[data-test-subj="tines-storySelector"]').exists()).toBe(true);
      expect(wrapper.find('[data-test-subj="tines-storySelector"]').first().text()).toBe(
        story.name
      );
      expect(wrapper.find('[data-test-subj="tines-webhookSelector"]').exists()).toBe(true);
      expect(wrapper.find('[data-test-subj="tines-webhookSelector"]').first().text()).toBe(
        webhook.name
      );
    });

    it('should call useSubAction with form values', () => {
      mountWithIntl(
        <TinesParamsFields
          actionParams={actionParams}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          messageVariables={messageVariables}
        />
      );
      expect(mockUseSubActionStories).toHaveBeenCalledWith(
        expect.objectContaining({ subAction: 'stories' })
      );
      expect(mockUseSubActionWebhooks).toHaveBeenCalledWith(
        expect.objectContaining({
          subAction: 'webhooks',
          subActionParams: { storyId: story.id },
        })
      );
    });

    it('should show warning if story not found', () => {
      mountWithIntl(
        <TinesParamsFields
          actionParams={{ subActionParams: { webhook: { ...webhook, storyId: story.id + 1 } } }}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          messageVariables={messageVariables}
        />
      );

      expect(mockToasts.warning).toHaveBeenCalledWith({
        title: 'Can not find the saved story. Please select a valid story from the selector',
      });
    });

    it('should show warning if webhook not found', () => {
      mountWithIntl(
        <TinesParamsFields
          actionParams={{ subActionParams: { webhook: { ...webhook, id: webhook.id + 1 } } }}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          messageVariables={messageVariables}
        />
      );

      expect(mockToasts.warning).toHaveBeenCalledWith({
        title: 'Can not find the saved webhook. Please select a valid webhook from the selector',
      });
    });

    describe('subActions error', () => {
      it('should show error when stories subAction has error', () => {
        const errorMessage = 'something broke';
        mockUseSubActionStories.mockReturnValueOnce({
          isLoading: false,
          response: [story],
          error: new Error(errorMessage),
        });

        mountWithIntl(
          <TinesParamsFields
            actionParams={{}}
            errors={emptyErrors}
            editAction={mockEditAction}
            index={index}
            messageVariables={messageVariables}
          />
        );

        expect(mockToasts.danger).toHaveBeenCalledWith({
          title: 'Error retrieving stories from Tines',
          body: errorMessage,
        });
      });

      it('should show error when webhooks subAction has error', () => {
        const errorMessage = 'something broke';
        mockUseSubActionWebhooks.mockReturnValueOnce({
          isLoading: false,
          response: [webhook],
          error: new Error(errorMessage),
        });

        mountWithIntl(
          <TinesParamsFields
            actionParams={{}}
            errors={emptyErrors}
            editAction={mockEditAction}
            index={index}
            messageVariables={messageVariables}
          />
        );

        expect(mockToasts.danger).toHaveBeenCalledWith({
          title: 'Error retrieving webhook actions from Tines',
          body: errorMessage,
        });
      });
    });
  });
});
