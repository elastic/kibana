/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { waitFor } from '@testing-library/react';

import { TestProviders } from '../../common/mock';
import { Form, useForm, FormHook } from '../../common/shared_imports';
import { CasesTimelineIntegrationProvider } from '../timeline_context';
import { timelineIntegrationMock } from '../__mock__/timeline';
import { getFormMock } from '../__mock__/form';
import { InsertTimeline } from '.';
import { useTimelineContext } from '../timeline_context/use_timeline_context';

jest.mock('@kbn/es-ui-shared-plugin/static/forms/hook_form_lib/hooks/use_form');
jest.mock('../timeline_context/use_timeline_context');

const useFormMock = useForm as jest.Mock;
const useTimelineContextMock = useTimelineContext as jest.Mock;

describe('InsertTimeline ', () => {
  const formHookMock = getFormMock({ comment: 'someValue' });
  const mockTimelineIntegration = { ...timelineIntegrationMock };
  const useInsertTimelineMock = jest.fn();
  let attachTimeline = jest.fn();
  beforeEach(() => {
    jest.resetAllMocks();
    useFormMock.mockImplementation(() => ({ form: formHookMock }));
  });

  it('it should not call useInsertTimeline without timeline context', async () => {
    mount(
      <TestProviders>
        <CasesTimelineIntegrationProvider>
          <Form form={formHookMock as unknown as FormHook}>
            <InsertTimeline fieldName="comment" />
          </Form>
        </CasesTimelineIntegrationProvider>
      </TestProviders>
    );

    await waitFor(() => {
      expect(attachTimeline).not.toHaveBeenCalled();
    });
  });

  it('should call useInsertTimeline with correct arguments', async () => {
    useInsertTimelineMock.mockImplementation((comment, onTimelineAttached) => {
      attachTimeline = onTimelineAttached;
    });
    mockTimelineIntegration.hooks.useInsertTimeline = useInsertTimelineMock;
    useTimelineContextMock.mockImplementation(() => ({ ...mockTimelineIntegration }));

    mount(
      <TestProviders>
        <CasesTimelineIntegrationProvider timelineIntegration={mockTimelineIntegration}>
          <Form form={formHookMock as unknown as FormHook}>
            <InsertTimeline fieldName="comment" />
          </Form>
        </CasesTimelineIntegrationProvider>
      </TestProviders>
    );

    await waitFor(() => {
      expect(useInsertTimelineMock).toHaveBeenCalledWith('someValue', attachTimeline);
    });
  });
});
