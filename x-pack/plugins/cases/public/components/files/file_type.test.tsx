/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { JsonValue } from '@kbn/utility-types';

import { screen } from '@testing-library/react';

import type { ExternalReferenceAttachmentViewProps } from '../../client/attachment_framework/types';
import type { AppMockRenderer } from '../../common/mock';

import { AttachmentActionType } from '../../client/attachment_framework/types';
import { FILE_ATTACHMENT_TYPE } from '../../../common/api';
import { createAppMockRenderer } from '../../common/mock';
import { basicCase, basicFileMock } from '../../containers/mock';
import { getFileType } from './file_type';
import userEvent from '@testing-library/user-event';

describe('getFileType', () => {
  const fileType = getFileType();

  it('invalid props return blank FileAttachmentViewObject', () => {
    expect(fileType).toStrictEqual({
      id: FILE_ATTACHMENT_TYPE,
      icon: 'document',
      displayName: 'File Attachment Type',
      getAttachmentViewObject: expect.any(Function),
      hideDefaultActions: true,
    });
  });

  describe('getFileAttachmentViewObject', () => {
    let appMockRender: AppMockRenderer;

    const attachmentViewProps = {
      externalReferenceId: basicFileMock.id,
      externalReferenceMetadata: { files: [basicFileMock] },
      caseData: { title: basicCase.title, id: basicCase.id },
    } as unknown as ExternalReferenceAttachmentViewProps;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('event renders a clickable name if the file is an image', async () => {
      appMockRender = createAppMockRenderer();

      // @ts-ignore
      appMockRender.render(fileType.getAttachmentViewObject({ ...attachmentViewProps }).event);

      const nameLink = await screen.findByTestId('cases-files-name-link');

      expect(nameLink).toBeInTheDocument();
      expect(nameLink).toHaveTextContent('my-super-cool-screenshot.png');
    });

    it('actions renders a download button', async () => {
      appMockRender = createAppMockRenderer();

      const attachmentViewObject = fileType.getAttachmentViewObject({ ...attachmentViewProps });

      expect(attachmentViewObject).not.toBeUndefined();

      // @ts-ignore
      const actions = attachmentViewObject.getActions();

      expect(actions.length).toBe(2);
      expect(actions[0]).toStrictEqual({
        type: AttachmentActionType.CUSTOM,
        isPrimary: true,
        label: 'Download File',
        render: expect.any(Function),
      });

      // @ts-ignore
      appMockRender.render(actions[0].render());

      expect(await screen.findByTestId('cases-files-download-button')).toBeInTheDocument();
    });

    it('actions renders a delete button', async () => {
      appMockRender = createAppMockRenderer();

      const attachmentViewObject = fileType.getAttachmentViewObject({ ...attachmentViewProps });

      expect(attachmentViewObject).not.toBeUndefined();

      // @ts-ignore
      const actions = attachmentViewObject.getActions();

      expect(actions.length).toBe(2);
      expect(actions[1]).toStrictEqual({
        type: AttachmentActionType.CUSTOM,
        isPrimary: true,
        label: 'Delete File',
        render: expect.any(Function),
      });

      // @ts-ignore
      appMockRender.render(actions[1].render());

      expect(await screen.findByTestId('cases-files-delete-button')).toBeInTheDocument();
    });

    it('clicking the delete button in actions opens deletion modal', async () => {
      appMockRender = createAppMockRenderer();

      const attachmentViewObject = fileType.getAttachmentViewObject({ ...attachmentViewProps });

      expect(attachmentViewObject).not.toBeUndefined();

      // @ts-ignore
      const actions = attachmentViewObject.getActions();

      expect(actions.length).toBe(2);
      expect(actions[1]).toStrictEqual({
        type: AttachmentActionType.CUSTOM,
        isPrimary: true,
        label: 'Delete File',
        render: expect.any(Function),
      });

      // @ts-ignore
      appMockRender.render(actions[1].render());

      const deleteButton = await screen.findByTestId('cases-files-delete-button');

      expect(deleteButton).toBeInTheDocument();

      userEvent.click(deleteButton);

      expect(await screen.findByTestId('property-actions-confirm-modal')).toBeInTheDocument();
    });

    it('empty externalReferenceMetadata returns blank FileAttachmentViewObject', () => {
      expect(
        fileType.getAttachmentViewObject({ ...attachmentViewProps, externalReferenceMetadata: {} })
      ).toEqual({
        event: 'added an unknown file',
        hideDefaultActions: true,
        timelineAvatar: 'document',
        type: 'regular',
      });
    });

    it('timelineAvatar is image if file is an image', () => {
      expect(fileType.getAttachmentViewObject(attachmentViewProps)).toEqual(
        expect.objectContaining({
          timelineAvatar: 'image',
        })
      );
    });

    it('timelineAvatar is document if file is not an image', () => {
      expect(
        fileType.getAttachmentViewObject({
          ...attachmentViewProps,
          externalReferenceMetadata: {
            files: [{ ...basicFileMock, mimeType: 'text/csv' } as JsonValue],
          },
        })
      ).toEqual(
        expect.objectContaining({
          timelineAvatar: 'document',
        })
      );
    });

    it('default actions should be hidden', () => {
      expect(fileType.getAttachmentViewObject(attachmentViewProps)).toEqual(
        expect.objectContaining({
          hideDefaultActions: true,
        })
      );
    });
  });
});
