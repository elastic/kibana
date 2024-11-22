/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { FileUploadProps } from '@kbn/shared-ux-file-upload';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { AppMockRenderer } from '../../common/mock';

import * as api from '../../containers/api';
import {
  buildCasesPermissions,
  createAppMockRenderer,
  mockedTestProvidersOwner,
} from '../../common/mock';
import { AddFile } from './add_file';
import { useToasts } from '../../common/lib/kibana';

import { useCreateAttachments } from '../../containers/use_create_attachments';
import { basicCaseId, basicFileMock } from '../../containers/mock';

jest.mock('../../containers/api');
jest.mock('../../containers/use_create_attachments');
jest.mock('../../common/lib/kibana');

const useToastsMock = useToasts as jest.Mock;
const useCreateAttachmentsMock = useCreateAttachments as jest.Mock;

const mockedExternalReferenceId = 'externalReferenceId';
const validateMetadata = jest.fn();
const mockFileUpload = jest
  .fn()
  .mockImplementation(
    ({
      kind,
      onDone,
      onError,
      meta,
    }: Required<Pick<FileUploadProps, 'kind' | 'onDone' | 'onError' | 'meta'>>) => (
      <>
        <button
          data-test-subj="testOnDone"
          type="button"
          onClick={() =>
            onDone([{ id: mockedExternalReferenceId, kind, fileJSON: { ...basicFileMock, meta } }])
          }
        >
          {'test'}
        </button>
        <button
          data-test-subj="testOnError"
          type="button"
          onClick={() => onError({ name: 'upload error name', message: 'upload error message' })}
        >
          {'test'}
        </button>
        <button data-test-subj="testMetadata" type="button" onClick={() => validateMetadata(meta)}>
          {'test'}
        </button>
      </>
    )
  );

jest.mock('@kbn/shared-ux-file-upload', () => {
  const original = jest.requireActual('@kbn/shared-ux-file-upload');
  return {
    ...original,
    FileUpload: (props: unknown) => mockFileUpload(props),
  };
});

describe('AddFile', () => {
  let appMockRender: AppMockRenderer;

  const successMock = jest.fn();
  const errorMock = jest.fn();

  useToastsMock.mockImplementation(() => {
    return {
      addSuccess: successMock,
      addError: errorMock,
    };
  });

  const createAttachmentsMock = jest.fn();

  useCreateAttachmentsMock.mockReturnValue({
    isLoading: false,
    mutateAsync: createAttachmentsMock,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders correctly', async () => {
    appMockRender.render(<AddFile caseId={'foobar'} />);

    expect(await screen.findByTestId('cases-files-add')).toBeInTheDocument();
  });

  it('AddFile is not rendered if user has no createComment permission', async () => {
    appMockRender = createAppMockRenderer({
      permissions: buildCasesPermissions({ createComment: false }),
    });

    appMockRender.render(<AddFile caseId={'foobar'} />);

    expect(screen.queryByTestId('cases-files-add')).not.toBeInTheDocument();
  });

  it('clicking button renders modal', async () => {
    appMockRender.render(<AddFile caseId={'foobar'} />);

    await userEvent.click(await screen.findByTestId('cases-files-add'));

    expect(await screen.findByTestId('cases-files-add-modal')).toBeInTheDocument();
  });

  it('createAttachments called with right parameters', async () => {
    appMockRender.render(<AddFile caseId={'foobar'} />);

    await userEvent.click(await screen.findByTestId('cases-files-add'));

    expect(await screen.findByTestId('cases-files-add-modal')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('testOnDone'));

    await waitFor(() =>
      expect(createAttachmentsMock).toBeCalledWith({
        caseId: 'foobar',
        caseOwner: mockedTestProvidersOwner[0],
        attachments: [
          {
            externalReferenceAttachmentTypeId: '.files',
            externalReferenceId: mockedExternalReferenceId,
            externalReferenceMetadata: {
              files: [
                {
                  created: '2020-02-19T23:06:33.798Z',
                  extension: 'png',
                  mimeType: 'image/png',
                  name: 'my-super-cool-screenshot',
                },
              ],
            },
            externalReferenceStorage: { soType: 'file', type: 'savedObject' },
            type: 'externalReference',
          },
        ],
      })
    );

    await waitFor(() =>
      expect(successMock).toHaveBeenCalledWith({
        className: 'eui-textBreakWord',
        title: `File ${basicFileMock.name} uploaded successfully`,
      })
    );
  });

  it('failed upload displays error toast', async () => {
    appMockRender.render(<AddFile caseId={'foobar'} />);

    await userEvent.click(await screen.findByTestId('cases-files-add'));

    expect(await screen.findByTestId('cases-files-add-modal')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('testOnError'));

    expect(errorMock).toHaveBeenCalledWith(
      { name: 'upload error name', message: 'upload error message' },
      {
        title: 'Failed to upload file',
      }
    );
  });

  it('correct metadata is passed to FileUpload component', async () => {
    const caseId = 'foobar';

    appMockRender.render(<AddFile caseId={caseId} />);

    await userEvent.click(await screen.findByTestId('cases-files-add'));

    expect(await screen.findByTestId('cases-files-add-modal')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('testMetadata'));

    await waitFor(() =>
      expect(validateMetadata).toHaveBeenCalledWith({
        caseIds: [caseId],
        owner: [mockedTestProvidersOwner[0]],
      })
    );
  });

  it('deleteFileAttachments is called correctly if createAttachments fails', async () => {
    const spyOnDeleteFileAttachments = jest.spyOn(api, 'deleteFileAttachments');

    createAttachmentsMock.mockImplementation(() => {
      throw new Error();
    });

    appMockRender.render(<AddFile caseId={basicCaseId} />);

    await userEvent.click(await screen.findByTestId('cases-files-add'));

    expect(await screen.findByTestId('cases-files-add-modal')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('testOnDone'));

    expect(spyOnDeleteFileAttachments).toHaveBeenCalledWith({
      caseId: basicCaseId,
      fileIds: [mockedExternalReferenceId],
    });

    createAttachmentsMock.mockRestore();
  });
});
