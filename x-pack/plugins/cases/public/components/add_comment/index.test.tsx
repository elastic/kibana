/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { noop } from 'lodash/fp';

import { noCreateCasesPermissions, TestProviders, createAppMockRenderer } from '../../common/mock';

import { AttachmentType } from '../../../common/types/domain';
import { SECURITY_SOLUTION_OWNER, MAX_COMMENT_LENGTH } from '../../../common/constants';
import { useCreateAttachments } from '../../containers/use_create_attachments';
import type { AddCommentProps, AddCommentRefObject } from '.';
import { AddComment } from '.';
import { CasesTimelineIntegrationProvider } from '../timeline_context';
import { timelineIntegrationMock } from '../__mock__/timeline';
import type { CaseAttachmentWithoutOwner } from '../../types';
import type { AppMockRenderer } from '../../common/mock';

jest.mock('../../containers/use_create_attachments');

const useCreateAttachmentsMock = useCreateAttachments as jest.Mock;
const onCommentSaving = jest.fn();
const onCommentPosted = jest.fn();
const createAttachments = jest.fn();

const addCommentProps: AddCommentProps = {
  id: 'newComment',
  caseId: '1234',
  onCommentSaving,
  onCommentPosted,
  showLoading: false,
  statusActionButton: null,
};

const defaultResponse = {
  isLoading: false,
  isError: false,
  mutate: createAttachments,
};

const sampleData: CaseAttachmentWithoutOwner = {
  comment: 'what a cool comment',
  type: AttachmentType.user as const,
};
const appId = 'testAppId';
const draftKey = `cases.${appId}.${addCommentProps.caseId}.${addCommentProps.id}.markdownEditor`;

// FLAKY: https://github.com/elastic/kibana/issues/168505
// FLAKY: https://github.com/elastic/kibana/issues/168506
// FLAKY: https://github.com/elastic/kibana/issues/168507
// FLAKY: https://github.com/elastic/kibana/issues/168508
// FLAKY: https://github.com/elastic/kibana/issues/168509
describe.skip('AddComment ', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
    useCreateAttachmentsMock.mockImplementation(() => defaultResponse);
  });

  afterEach(() => {
    sessionStorage.removeItem(draftKey);
  });

  it('renders correctly', () => {
    appMockRender.render(<AddComment {...addCommentProps} />);

    expect(screen.getByTestId('add-comment')).toBeInTheDocument();
  });

  it('should render spinner and disable submit when loading', () => {
    useCreateAttachmentsMock.mockImplementation(() => ({
      ...defaultResponse,
      isLoading: true,
    }));
    appMockRender.render(<AddComment {...{ ...addCommentProps, showLoading: true }} />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByTestId('submit-comment')).toHaveAttribute('disabled');
  });

  it('should hide the component when the user does not have create permissions', () => {
    useCreateAttachmentsMock.mockImplementation(() => ({
      ...defaultResponse,
      isLoading: true,
    }));

    appMockRender.render(
      <TestProviders permissions={noCreateCasesPermissions()}>
        <AddComment {...{ ...addCommentProps }} />
      </TestProviders>
    );

    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
  });

  it('should post comment on submit click', async () => {
    appMockRender.render(<AddComment {...addCommentProps} />);

    const markdown = screen.getByTestId('euiMarkdownEditorTextArea');

    userEvent.type(markdown, sampleData.comment);

    userEvent.click(screen.getByTestId('submit-comment'));

    await waitFor(() => {
      expect(onCommentSaving).toBeCalled();
      expect(createAttachments).toBeCalledWith(
        {
          caseId: addCommentProps.caseId,
          caseOwner: SECURITY_SOLUTION_OWNER,
          attachments: [sampleData],
        },
        { onSuccess: expect.anything() }
      );
    });

    act(() => {
      createAttachments.mock.calls[0][1].onSuccess();
    });

    await waitFor(() => {
      expect(screen.getByTestId('euiMarkdownEditorTextArea')).toHaveTextContent('');
    });
  });

  it('should insert a quote', async () => {
    const sampleQuote = 'what a cool quote \n with new lines';
    const ref = React.createRef<AddCommentRefObject>();

    appMockRender.render(<AddComment {...addCommentProps} ref={ref} />);

    userEvent.type(screen.getByTestId('euiMarkdownEditorTextArea'), sampleData.comment);

    await act(async () => {
      ref.current!.addQuote(sampleQuote);
    });

    await waitFor(() => {
      expect(screen.getByTestId('euiMarkdownEditorTextArea').textContent).toContain(
        `${sampleData.comment}\n\n> what a cool quote \n>  with new lines \n\n`
      );
    });
  });

  it('should call onFocus when adding a quote', async () => {
    const ref = React.createRef<AddCommentRefObject>();

    appMockRender.render(<AddComment {...addCommentProps} ref={ref} />);

    ref.current!.editor!.textarea!.focus = jest.fn();

    await act(async () => {
      ref.current!.addQuote('a comment');
    });

    await waitFor(() => {
      expect(ref.current!.editor!.textarea!.focus).toHaveBeenCalled();
    });
  });

  it('should NOT call onFocus on mount', async () => {
    const ref = React.createRef<AddCommentRefObject>();

    appMockRender.render(<AddComment {...addCommentProps} ref={ref} />);

    ref.current!.editor!.textarea!.focus = jest.fn();
    expect(ref.current!.editor!.textarea!.focus).not.toHaveBeenCalled();
  });

  it('it should insert a timeline', async () => {
    const useInsertTimelineMock = jest.fn();
    let attachTimeline = noop;
    useInsertTimelineMock.mockImplementation((comment, onTimelineAttached) => {
      attachTimeline = onTimelineAttached;
    });

    const mockTimelineIntegration = { ...timelineIntegrationMock };
    mockTimelineIntegration.hooks.useInsertTimeline = useInsertTimelineMock;

    appMockRender.render(
      <CasesTimelineIntegrationProvider timelineIntegration={mockTimelineIntegration}>
        <AddComment {...addCommentProps} />
      </CasesTimelineIntegrationProvider>
    );

    act(() => {
      attachTimeline('[title](url)');
    });

    await waitFor(() => {
      expect(screen.getByTestId('euiMarkdownEditorTextArea')).toHaveTextContent('[title](url)');
    });
  });

  describe('errors', () => {
    it('shows an error when comment is empty', async () => {
      appMockRender.render(<AddComment {...addCommentProps} />);

      const markdown = screen.getByTestId('euiMarkdownEditorTextArea');

      userEvent.type(markdown, 'test');
      userEvent.clear(markdown);

      await waitFor(() => {
        expect(screen.getByText('Empty comments are not allowed.')).toBeInTheDocument();
        expect(screen.getByTestId('submit-comment')).toHaveAttribute('disabled');
      });
    });

    it('shows an error when comment is of empty characters', async () => {
      appMockRender.render(<AddComment {...addCommentProps} />);

      const markdown = screen.getByTestId('euiMarkdownEditorTextArea');

      userEvent.clear(markdown);
      userEvent.type(markdown, '  ');

      await waitFor(() => {
        expect(screen.getByText('Empty comments are not allowed.')).toBeInTheDocument();
        expect(screen.getByTestId('submit-comment')).toHaveAttribute('disabled');
      });
    });

    it('shows an error when comment is too long', async () => {
      const longComment = 'a'.repeat(MAX_COMMENT_LENGTH + 1);

      appMockRender.render(<AddComment {...addCommentProps} />);

      const markdown = screen.getByTestId('euiMarkdownEditorTextArea');

      userEvent.paste(markdown, longComment);

      await waitFor(() => {
        expect(
          screen.getByText(
            'The length of the comment is too long. The maximum length is 30000 characters.'
          )
        ).toBeInTheDocument();
        expect(screen.getByTestId('submit-comment')).toHaveAttribute('disabled');
      });
    });
  });
});

// Depends on useCreateAttachmentsMock.mockImplementation
// in describe.skip('AddComment')
// https://github.com/elastic/kibana/issues/169875
// FLAKY: https://github.com/elastic/kibana/issues/169876
describe.skip('draft comment ', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    appMockRenderer = createAppMockRenderer();
    jest.clearAllMocks();
  });

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should clear session storage on submit', async () => {
    appMockRenderer.render(<AddComment {...addCommentProps} />);

    fireEvent.change(screen.getByLabelText('caseComment'), {
      target: { value: sampleData.comment },
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.getByLabelText('caseComment')).toHaveValue(sessionStorage.getItem(draftKey));
    });

    fireEvent.click(screen.getByTestId('submit-comment'));

    await waitFor(() => {
      expect(onCommentSaving).toBeCalled();
      expect(createAttachments).toBeCalledWith(
        {
          caseId: addCommentProps.caseId,
          caseOwner: SECURITY_SOLUTION_OWNER,
          attachments: [sampleData],
        },
        { onSuccess: expect.anything() }
      );
    });

    act(() => {
      createAttachments.mock.calls[0][1].onSuccess();
    });

    await waitFor(() => {
      expect(screen.getByLabelText('caseComment').textContent).toBe('');
      expect(sessionStorage.getItem(draftKey)).toBe('');
    });
  });

  describe('existing storage key', () => {
    beforeEach(() => {
      sessionStorage.setItem(draftKey, 'value set in storage');
    });

    afterEach(() => {
      sessionStorage.removeItem(draftKey);
    });

    it('should have draft comment same as existing session storage', async () => {
      appMockRenderer.render(<AddComment {...addCommentProps} />);

      expect(screen.getByLabelText('caseComment')).toHaveValue('value set in storage');
    });
  });
});
