/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import type { UseSubActionParams } from '@kbn/triggers-actions-ui-plugin/public/application/hooks/use_sub_action';
import TinesParamsFields from './tines_params';
import { ActionConnectorMode } from '@kbn/triggers-actions-ui-plugin/public/types';

const triggersActionsPath = '@kbn/triggers-actions-ui-plugin/public';
interface Result {
  isLoading: boolean;
  response: Record<string, unknown>;
  error: null | Error;
}
const mockUseSubActionStories = jest.fn<Result, [UseSubActionParams<unknown>]>(() => ({
  isLoading: false,
  response: { stories: [story], incompleteResponse: false },
  error: null,
}));
const mockUseSubActionWebhooks = jest.fn<Result, [UseSubActionParams<unknown>]>(() => ({
  isLoading: false,
  response: { webhooks: [webhook], incompleteResponse: false },
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

const mockEditAction = jest.fn();
const index = 0;
const webhook = {
  id: 1234,
  storyId: 5678,
  name: 'test webhook',
  path: 'somePath',
  secret: 'someSecret',
};
const story = { id: webhook.storyId, name: 'test story', published: false };
const actionParams = { subActionParams: { webhook } };
const emptyErrors = { subAction: [], subActionParams: [] };

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
          executionMode={ActionConnectorMode.ActionForm}
        />
      );

      expect(wrapper.find('[data-test-subj="tines-bodyJsonEditor"]').exists()).toBe(false);

      expect(wrapper.find('[data-test-subj="tines-storySelector"]').exists()).toBe(true);
      expect(
        wrapper.find('[data-test-subj="tines-storySelector"]').first().find('input').props()
          .placeholder
      ).toBe('Select a Tines story');
      expect(wrapper.find('[data-test-subj="tines-webhookSelector"]').exists()).toBe(true);
      expect(
        wrapper.find('[data-test-subj="tines-webhookSelector"]').first().find('input').props()
          .placeholder
      ).toBe('Select a story first');
      expect(wrapper.find('[data-test-subj="tines-fallbackCallout"]').exists()).toBe(false);
      expect(wrapper.find('[data-test-subj="tines-webhookUrlInput"]').exists()).toBe(false);

      expect(mockEditAction).toHaveBeenCalledWith('subAction', 'run', index);
    });

    it('should render empty test form', () => {
      const wrapper = mountWithIntl(
        <TinesParamsFields
          actionParams={{}}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          executionMode={ActionConnectorMode.Test}
        />
      );

      expect(wrapper.find('[data-test-subj="tines-bodyJsonEditor"]').exists()).toBe(true);
      expect(wrapper.find('[data-test-subj="bodyAddVariableButton"]').exists()).toBe(false);

      expect(wrapper.find('[data-test-subj="tines-storySelector"]').exists()).toBe(true);
      expect(
        wrapper.find('[data-test-subj="tines-storySelector"] input').first().props().placeholder
      ).toBe('Select a Tines story');
      expect(wrapper.find('[data-test-subj="tines-webhookSelector"]').exists()).toBe(true);
      expect(
        wrapper.find('[data-test-subj="tines-webhookSelector"] input').first().props().placeholder
      ).toBe('Select a story first');

      expect(mockEditAction).toHaveBeenCalledWith('subAction', 'test', index);
    });

    it('should call useSubAction with empty form', () => {
      mountWithIntl(
        <TinesParamsFields
          actionParams={{}}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          executionMode={ActionConnectorMode.ActionForm}
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
          executionMode={ActionConnectorMode.ActionForm}
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

    it('should render with a story option with Published badge', () => {
      mockUseSubActionStories.mockReturnValueOnce({
        isLoading: false,
        response: { stories: [{ ...story, published: true }], incompleteResponse: false },
        error: null,
      });

      const wrapper = mountWithIntl(
        <TinesParamsFields
          actionParams={{}}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          executionMode={ActionConnectorMode.ActionForm}
        />
      );
      wrapper
        .find('[data-test-subj="tines-storySelector"] [data-test-subj="comboBoxToggleListButton"]')
        .first()
        .simulate('click');

      expect(wrapper.find('[data-test-subj="tines-storySelector-optionsList"]').text()).toContain(
        'Published'
      );
    });

    it('should enable with webhook selector when story selected', () => {
      const wrapper = mountWithIntl(
        <TinesParamsFields
          actionParams={{}}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          executionMode={ActionConnectorMode.ActionForm}
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
      expect(
        wrapper.find('[data-test-subj="tines-webhookSelector"] input').first().props().placeholder
      ).toBe('Select a webhook action');
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
          executionMode={ActionConnectorMode.ActionForm}
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

    it('should render webhook url fallback when response incomplete', () => {
      mockUseSubActionStories.mockReturnValueOnce({
        isLoading: false,
        response: { stories: [story], incompleteResponse: true },
        error: null,
      });

      const wrapper = mountWithIntl(
        <TinesParamsFields
          actionParams={{}}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          executionMode={ActionConnectorMode.ActionForm}
        />
      );
      expect(wrapper.find('[data-test-subj="tines-fallbackCallout"]').exists()).toBe(true);
      expect(wrapper.find('[data-test-subj="tines-webhookUrlInput"]').exists()).toBe(true);
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
          executionMode={ActionConnectorMode.ActionForm}
        />
      );

      expect(wrapper.find('[data-test-subj="tines-bodyJsonEditor"]').exists()).toBe(false);
      expect(wrapper.find('[data-test-subj="tines-storySelector"]').exists()).toBe(true);
      expect(
        wrapper.find('[data-test-subj="tines-storySelector"] input').first().props().value
      ).toBe(story.name);
      expect(wrapper.find('[data-test-subj="tines-webhookSelector"]').exists()).toBe(true);
      expect(
        wrapper.find('[data-test-subj="tines-webhookSelector"] input').first().props().value
      ).toBe(webhook.name);

      expect(wrapper.find('[data-test-subj="tines-fallbackCallout"]').exists()).toBe(false);
      expect(wrapper.find('[data-test-subj="tines-webhookUrlInput"]').exists()).toBe(false);
    });

    it('should call useSubAction with form values', () => {
      mountWithIntl(
        <TinesParamsFields
          actionParams={actionParams}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          executionMode={ActionConnectorMode.ActionForm}
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
          executionMode={ActionConnectorMode.ActionForm}
        />
      );

      expect(mockToasts.warning).toHaveBeenCalledWith({
        title: 'Cannot find the saved story. Please select a valid story from the selector',
      });
    });

    it('should show warning if webhook not found', () => {
      mountWithIntl(
        <TinesParamsFields
          actionParams={{ subActionParams: { webhook: { ...webhook, id: webhook.id + 1 } } }}
          errors={emptyErrors}
          editAction={mockEditAction}
          index={index}
          executionMode={ActionConnectorMode.ActionForm}
        />
      );

      expect(mockToasts.warning).toHaveBeenCalledWith({
        title: 'Cannot find the saved webhook. Please select a valid webhook from the selector',
      });
    });

    describe('WebhookUrl fallback', () => {
      beforeEach(() => {
        mockUseSubActionStories.mockReturnValue({
          isLoading: false,
          response: { stories: [story], incompleteResponse: true },
          error: null,
        });

        mockUseSubActionWebhooks.mockReturnValue({
          isLoading: false,
          response: { webhooks: [webhook], incompleteResponse: true },
          error: null,
        });
      });

      it('should not render webhook url fallback when stories response incomplete but selected story found', () => {
        const wrapper = mountWithIntl(
          <TinesParamsFields
            actionParams={actionParams}
            errors={emptyErrors}
            editAction={mockEditAction}
            index={index}
            executionMode={ActionConnectorMode.ActionForm}
          />
        );
        expect(wrapper.find('[data-test-subj="tines-fallbackCallout"]').exists()).toBe(false);
        expect(wrapper.find('[data-test-subj="tines-webhookUrlInput"]').exists()).toBe(false);
      });

      it('should render webhook url fallback when stories response incomplete and selected story not found', () => {
        mockUseSubActionStories.mockReturnValue({
          isLoading: false,
          response: { stories: [], incompleteResponse: true },
          error: null,
        });

        const wrapper = mountWithIntl(
          <TinesParamsFields
            actionParams={actionParams}
            errors={emptyErrors}
            editAction={mockEditAction}
            index={index}
            executionMode={ActionConnectorMode.ActionForm}
          />
        );
        expect(wrapper.find('[data-test-subj="tines-fallbackCallout"]').exists()).toBe(true);
        expect(wrapper.find('[data-test-subj="tines-webhookUrlInput"]').exists()).toBe(true);
      });

      it('should not render webhook url fallback when webhook response incomplete but webhook selected found', () => {
        const wrapper = mountWithIntl(
          <TinesParamsFields
            actionParams={actionParams}
            errors={emptyErrors}
            editAction={mockEditAction}
            index={index}
            executionMode={ActionConnectorMode.ActionForm}
          />
        );
        expect(wrapper.find('[data-test-subj="tines-fallbackCallout"]').exists()).toBe(false);
        expect(wrapper.find('[data-test-subj="tines-webhookUrlInput"]').exists()).toBe(false);
      });

      it('should render webhook url fallback when webhook response incomplete and webhook selected not found', () => {
        mockUseSubActionWebhooks.mockReturnValue({
          isLoading: false,
          response: { webhooks: [], incompleteResponse: true },
          error: null,
        });

        const wrapper = mountWithIntl(
          <TinesParamsFields
            actionParams={actionParams}
            errors={emptyErrors}
            editAction={mockEditAction}
            index={index}
            executionMode={ActionConnectorMode.ActionForm}
          />
        );
        expect(wrapper.find('[data-test-subj="tines-fallbackCallout"]').exists()).toBe(true);
        expect(wrapper.find('[data-test-subj="tines-webhookUrlInput"]').exists()).toBe(true);
      });

      it('should render webhook url fallback without callout when responses are complete but webhookUrl is stored', () => {
        const webhookUrl = 'https://example.tines.com/1234';
        const wrapper = mountWithIntl(
          <TinesParamsFields
            actionParams={{ subActionParams: { ...actionParams.subActionParams, webhookUrl } }}
            errors={emptyErrors}
            editAction={mockEditAction}
            index={index}
            executionMode={ActionConnectorMode.ActionForm}
          />
        );
        expect(wrapper.find('[data-test-subj="tines-fallbackCallout"]').exists()).toBe(false);
        expect(wrapper.find('input[data-test-subj="tines-webhookUrlInput"]').exists()).toBe(true);
        expect(wrapper.find('input[data-test-subj="tines-webhookUrlInput"]').prop('value')).toBe(
          webhookUrl
        );
      });
    });

    describe('subActions error', () => {
      it('should show error when stories subAction has error', () => {
        const errorMessage = 'something broke';
        mockUseSubActionStories.mockReturnValueOnce({
          isLoading: false,
          response: { stories: [story] },
          error: new Error(errorMessage),
        });

        mountWithIntl(
          <TinesParamsFields
            actionParams={{}}
            errors={emptyErrors}
            editAction={mockEditAction}
            index={index}
            executionMode={ActionConnectorMode.ActionForm}
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
          response: { webhooks: [webhook] },
          error: new Error(errorMessage),
        });

        mountWithIntl(
          <TinesParamsFields
            actionParams={{}}
            errors={emptyErrors}
            editAction={mockEditAction}
            index={index}
            executionMode={ActionConnectorMode.ActionForm}
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
