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

import { FILE_ATTACHMENT_TYPE } from '../../../common/api';
import { createAppMockRenderer } from '../../common/mock';
import { basicCase, basicFileMock } from '../../containers/mock';
import { getFileType } from './file_type';

describe('getFileType', () => {
  const fileType = getFileType();

  it('invalid props return blank FileAttachmentViewObject', () => {
    expect(fileType).toStrictEqual({
      id: FILE_ATTACHMENT_TYPE,
      icon: 'document',
      displayName: 'File Attachment Type',
      getAttachmentViewObject: expect.any(Function),
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

      // @ts-ignore
      appMockRender.render(fileType.getAttachmentViewObject({ ...attachmentViewProps }).actions);

      expect(await screen.findByTestId('cases-files-download-button')).toBeInTheDocument();
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
