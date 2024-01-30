/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { AppMockRenderer } from '../../common/mock';
import {
  buildCasesPermissions,
  createAppMockRenderer,
  mockedTestProvidersOwner,
} from '../../common/mock';
import { constructFileKindIdByOwner } from '../../../common/files';

import { basicCaseId, basicFileMock } from '../../containers/mock';
import { FileActionsPopoverButton } from './file_actions_popover_button';
import { useDeleteFileAttachment } from '../../containers/use_delete_file_attachment';

jest.mock('../../containers/use_delete_file_attachment');

const useDeleteFileAttachmentMock = useDeleteFileAttachment as jest.Mock;

describe('FileActionsPopoverButton', () => {
  let appMockRender: AppMockRenderer;
  const mutate = jest.fn();

  useDeleteFileAttachmentMock.mockReturnValue({ isLoading: false, mutate });

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders file actions popover button correctly', async () => {
    appMockRender.render(<FileActionsPopoverButton caseId={basicCaseId} theFile={basicFileMock} />);

    expect(
      await screen.findByTestId(`cases-files-actions-popover-button-${basicFileMock.id}`)
    ).toBeInTheDocument();
  });

  it('clicking the button opens the popover', async () => {
    appMockRender.render(<FileActionsPopoverButton caseId={basicCaseId} theFile={basicFileMock} />);

    userEvent.click(
      await screen.findByTestId(`cases-files-actions-popover-button-${basicFileMock.id}`)
    );

    expect(
      await screen.findByTestId(`cases-files-popover-${basicFileMock.id}`)
    ).toBeInTheDocument();
    expect(await screen.findByTestId('cases-files-delete-button')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-files-download-button')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-files-copy-hash-button')).toBeInTheDocument();
  });

  it('does not render the copy hash button if the file has no hashes', async () => {
    appMockRender.render(
      <FileActionsPopoverButton caseId={basicCaseId} theFile={{ ...basicFileMock, hash: {} }} />
    );

    userEvent.click(
      await screen.findByTestId(`cases-files-actions-popover-button-${basicFileMock.id}`)
    );

    expect(
      await screen.findByTestId(`cases-files-popover-${basicFileMock.id}`)
    ).toBeInTheDocument();

    expect(await screen.queryByTestId('cases-files-copy-hash-button')).not.toBeInTheDocument();
  });

  it('clicking the copy file hash button rerenders the popover correctly', async () => {
    appMockRender.render(<FileActionsPopoverButton caseId={basicCaseId} theFile={basicFileMock} />);

    const popoverButton = await screen.findByTestId(
      `cases-files-actions-popover-button-${basicFileMock.id}`
    );

    expect(popoverButton).toBeInTheDocument();
    userEvent.click(popoverButton);

    expect(
      await screen.findByTestId(`cases-files-popover-${basicFileMock.id}`)
    ).toBeInTheDocument();

    const copyFileHashButton = await screen.findByTestId('cases-files-copy-hash-button');

    expect(copyFileHashButton).toBeInTheDocument();

    userEvent.click(copyFileHashButton);

    expect(await screen.findByTestId('cases-files-copy-md5-hash-button')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-files-copy-sha1-hash-button')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-files-copy-sha256-hash-button')).toBeInTheDocument();

    expect(
      (
        await within(await screen.findByTestId('cases-files-popover-context-menu')).findAllByRole(
          'button'
        )
      ).length
    ).toBe(7);
  });

  describe('copy file hashes', () => {
    const originalClipboard = global.window.navigator.clipboard;

    beforeEach(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: jest.fn().mockImplementation(() => Promise.resolve()),
        },
        writable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
      });
    });

    it('clicking copy md5 file hash copies the hash to the clipboard', async () => {
      appMockRender.render(
        <FileActionsPopoverButton caseId={basicCaseId} theFile={basicFileMock} />
      );

      userEvent.click(
        await screen.findByTestId(`cases-files-actions-popover-button-${basicFileMock.id}`)
      );

      userEvent.click(await screen.findByTestId('cases-files-copy-hash-button'), undefined, {
        skipPointerEventsCheck: true,
      });
      userEvent.click(await screen.findByTestId('cases-files-copy-md5-hash-button'), undefined, {
        skipPointerEventsCheck: true,
      });

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(basicFileMock.hash?.md5);
      });
    });

    it('clicking copy SHA1 file hash copies the hash to the clipboard', async () => {
      appMockRender.render(
        <FileActionsPopoverButton caseId={basicCaseId} theFile={basicFileMock} />
      );

      userEvent.click(
        await screen.findByTestId(`cases-files-actions-popover-button-${basicFileMock.id}`)
      );

      userEvent.click(await screen.findByTestId('cases-files-copy-hash-button'), undefined, {
        skipPointerEventsCheck: true,
      });
      userEvent.click(await screen.findByTestId('cases-files-copy-sha1-hash-button'), undefined, {
        skipPointerEventsCheck: true,
      });

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(basicFileMock.hash?.sha1);
      });
    });

    it('clicking copy SHA256 file hash copies the hash to the clipboard', async () => {
      appMockRender.render(
        <FileActionsPopoverButton caseId={basicCaseId} theFile={basicFileMock} />
      );

      userEvent.click(
        await screen.findByTestId(`cases-files-actions-popover-button-${basicFileMock.id}`)
      );

      userEvent.click(await screen.findByTestId('cases-files-copy-hash-button'), undefined, {
        skipPointerEventsCheck: true,
      });
      userEvent.click(await screen.findByTestId('cases-files-copy-sha256-hash-button'), undefined, {
        skipPointerEventsCheck: true,
      });

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(basicFileMock.hash?.sha256);
      });
    });
  });

  describe('delete button', () => {
    it('clicking delete button opens the confirmation modal', async () => {
      appMockRender.render(
        <FileActionsPopoverButton caseId={basicCaseId} theFile={basicFileMock} />
      );

      userEvent.click(
        await screen.findByTestId(`cases-files-actions-popover-button-${basicFileMock.id}`)
      );

      userEvent.click(await screen.findByTestId('cases-files-delete-button'), undefined, {
        skipPointerEventsCheck: true,
      });

      expect(await screen.findByTestId('property-actions-confirm-modal')).toBeInTheDocument();
    });

    it('clicking delete button in the confirmation modal calls deleteFileAttachment with proper params', async () => {
      appMockRender.render(
        <FileActionsPopoverButton caseId={basicCaseId} theFile={basicFileMock} />
      );

      userEvent.click(
        await screen.findByTestId(`cases-files-actions-popover-button-${basicFileMock.id}`)
      );

      userEvent.click(await screen.findByTestId('cases-files-delete-button'), undefined, {
        skipPointerEventsCheck: true,
      });

      expect(await screen.findByTestId('property-actions-confirm-modal')).toBeInTheDocument();

      userEvent.click(await screen.findByTestId('confirmModalConfirmButton'));

      await waitFor(() => {
        expect(mutate).toHaveBeenCalledTimes(1);
        expect(mutate).toHaveBeenCalledWith({
          caseId: basicCaseId,
          fileId: basicFileMock.id,
        });
      });
    });

    it('delete button is not rendered if user has no delete permission', async () => {
      appMockRender = createAppMockRenderer({
        permissions: buildCasesPermissions({ delete: false }),
      });

      appMockRender.render(
        <FileActionsPopoverButton caseId={basicCaseId} theFile={basicFileMock} />
      );

      userEvent.click(
        await screen.findByTestId(`cases-files-actions-popover-button-${basicFileMock.id}`)
      );

      expect(screen.queryByTestId('cases-files-delete-button')).not.toBeInTheDocument();
    });
  });

  describe('download button', () => {
    it('renders download button with correct href', async () => {
      appMockRender.render(
        <FileActionsPopoverButton caseId={basicCaseId} theFile={basicFileMock} />
      );

      userEvent.click(
        await screen.findByTestId(`cases-files-actions-popover-button-${basicFileMock.id}`)
      );

      expect(await screen.findByTestId('cases-files-download-button')).toBeInTheDocument();

      await waitFor(() => {
        expect(appMockRender.getFilesClient().getDownloadHref).toBeCalled();
        expect(appMockRender.getFilesClient().getDownloadHref).toHaveBeenCalledWith({
          fileKind: constructFileKindIdByOwner(mockedTestProvidersOwner[0]),
          id: basicFileMock.id,
        });
      });
    });
  });
});
