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
import { createAttachments } from '../../containers/api';
import type { AddCommentProps, AddCommentRefObject } from '.';
import { AddComment } from '.';
import { CasesTimelineIntegrationProvider } from '../timeline_context';
import { timelineIntegrationMock } from '../__mock__/timeline';
import type { CaseAttachmentWithoutOwner } from '../../types';
import type { AppMockRenderer } from '../../common/mock';

jest.mock('../../containers/api', () => ({
  createAttachments: jest.fn(),
}));

const createAttachmentsMock = createAttachments as jest.Mock;
const onCommentSaving = jest.fn();
const onCommentPosted = jest.fn();

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
const appId = 'securitySolution';
const draftKey = `cases.${appId}.${addCommentProps.caseId}.${addCommentProps.id}.markdownEditor`;

describe('AddComment ', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
    createAttachmentsMock.mockImplementation(() => defaultResponse);
  });

  afterEach(() => {
    sessionStorage.removeItem(draftKey);
  });

  it('renders correctly', () => {
    appMockRender.render(<AddComment {...addCommentProps} />);

    expect(screen.getByTestId('add-comment')).toBeInTheDocument();
  });

  it('should render spinner and disable submit when loading', async () => {
    appMockRender.render(<AddComment {...{ ...addCommentProps, showLoading: true }} />);

    fireEvent.change(screen.getByLabelText('caseComment'), {
      target: { value: sampleData.comment },
    });

    fireEvent.click(screen.getByTestId('submit-comment'));

    expect(await screen.findByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByTestId('submit-comment')).toHaveAttribute('disabled');
  });

  it('should hide the component when the user does not have create permissions', () => {
    createAttachmentsMock.mockImplementation(() => ({
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

    await waitFor(() => expect(onCommentSaving).toBeCalled());
    await waitFor(() =>
      expect(createAttachmentsMock).toBeCalledWith({
        caseId: addCommentProps.caseId,
        attachments: [
          {
            comment: sampleData.comment,
            owner: SECURITY_SOLUTION_OWNER,
            type: AttachmentType.user,
          },
        ],
      })
    );
    await waitFor(() => {
      expect(screen.getByTestId('euiMarkdownEditorTextArea')).toHaveTextContent('');
    });
  });

  it('should insert a quote', async () => {
    const sampleQuote = 'what a cool quote \n with new lines';
    const ref = React.createRef<AddCommentRefObject>();

    appMockRender.render(<AddComment {...addCommentProps} ref={ref} />);

    userEvent.paste(await screen.findByTestId('euiMarkdownEditorTextArea'), sampleData.comment);

    await act(async () => {
      ref.current!.addQuote(sampleQuote);
    });

    expect((await screen.findByTestId('euiMarkdownEditorTextArea')).textContent).toContain(
      `${sampleData.comment}\n\n> what a cool quote \n>  with new lines \n\n`
    );
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

    await act(async () => {
      attachTimeline('[title](url)');
    });

    expect(await screen.findByTestId('euiMarkdownEditorTextArea')).toHaveTextContent(
      '[title](url)'
    );
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

describe('draft comment ', () => {
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
      expect(createAttachmentsMock).toBeCalledWith({
        caseId: addCommentProps.caseId,
        attachments: [
          {
            comment: sampleData.comment,
            owner: SECURITY_SOLUTION_OWNER,
            type: AttachmentType.user,
          },
        ],
      });
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
