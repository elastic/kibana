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

import { constructFileKindIdByOwner } from '../../../common/constants';
import {
  createAppMockRenderer,
  mockedTestProvidersOwner,
  mockedFilesClient,
} from '../../common/mock';
import { AddFile } from './add_file';
import { useToasts } from '../../common/lib/kibana';

import { useCreateAttachments } from '../../containers/use_create_attachments';
import { basicFileMock } from '../../containers/mock';

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    FileUpload: (props: any) => mockFileUpload(props),
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
    createAttachments: createAttachmentsMock,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
  });

  it('renders correctly', async () => {
    appMockRender.render(<AddFile caseId={'foobar'} />);

    expect(await screen.findByTestId('cases-files-add')).toBeInTheDocument();
  });

  it('clicking button renders modal', async () => {
    appMockRender.render(<AddFile caseId={'foobar'} />);

    userEvent.click(await screen.findByTestId('cases-files-add'));

    expect(await screen.findByTestId('cases-files-add-modal')).toBeInTheDocument();
  });

  it('createAttachments called with right parameters', async () => {
    appMockRender.render(<AddFile caseId={'foobar'} />);

    userEvent.click(await screen.findByTestId('cases-files-add'));

    expect(await screen.findByTestId('cases-files-add-modal')).toBeInTheDocument();

    userEvent.click(await screen.findByTestId('testOnDone'));

    await waitFor(() =>
      expect(createAttachmentsMock).toBeCalledWith(
        expect.objectContaining({
          caseId: 'foobar',
          caseOwner: mockedTestProvidersOwner[0],
          data: [
            {
              externalReferenceAttachmentTypeId: '.files',
              externalReferenceId: mockedExternalReferenceId,
              externalReferenceMetadata: {
                files: [
                  {
                    createdAt: '2020-02-19T23:06:33.798Z',
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
          throwOnError: true,
        })
      )
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

    userEvent.click(await screen.findByTestId('cases-files-add'));

    expect(await screen.findByTestId('cases-files-add-modal')).toBeInTheDocument();

    userEvent.click(await screen.findByTestId('testOnError'));

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

    userEvent.click(await screen.findByTestId('cases-files-add'));

    expect(await screen.findByTestId('cases-files-add-modal')).toBeInTheDocument();

    userEvent.click(await screen.findByTestId('testMetadata'));

    await waitFor(() =>
      expect(validateMetadata).toHaveBeenCalledWith({ caseId, owner: mockedTestProvidersOwner[0] })
    );
  });

  it('filesClient.delete is called correctly if createAttachments fails', async () => {
    createAttachmentsMock.mockImplementation(() => {
      throw new Error();
    });

    appMockRender.render(<AddFile caseId={'foobar'} />);

    userEvent.click(await screen.findByTestId('cases-files-add'));

    expect(await screen.findByTestId('cases-files-add-modal')).toBeInTheDocument();

    userEvent.click(await screen.findByTestId('testOnDone'));

    await waitFor(() =>
      expect(mockedFilesClient.delete).toHaveBeenCalledWith({
        id: mockedExternalReferenceId,
        kind: constructFileKindIdByOwner(mockedTestProvidersOwner[0]),
      })
    );

    createAttachmentsMock.mockRestore();
  });
});
