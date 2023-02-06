/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import type {
  ActionDetails,
  ResponseActionGetFileOutputContent,
  ResponseActionGetFileParameters,
} from '../../../../common/endpoint/types';
import React from 'react';
import type { ResponseActionFileDownloadLinkProps } from './response_action_file_download_link';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import {
  FILE_NO_LONGER_AVAILABLE_MESSAGE,
  ResponseActionFileDownloadLink,
} from './response_action_file_download_link';
import { responseActionsHttpMocks } from '../../mocks/response_actions_http_mocks';
import { useUserPrivileges as _useUserPrivileges } from '../../../common/components/user_privileges';
import { getDeferred } from '../../mocks/utils';
import { waitFor } from '@testing-library/react';
import type { IHttpFetchError } from '@kbn/core-http-browser';

jest.mock('../../../common/components/user_privileges');

describe('When using the `ResponseActionFileDownloadLink` component', () => {
  const useUserPrivilegesMock = _useUserPrivileges as jest.Mock<
    ReturnType<typeof _useUserPrivileges>
  >;

  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let renderProps: ResponseActionFileDownloadLinkProps;
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;

  beforeEach(() => {
    const appTestContext = createAppRootMockRenderer();

    apiMocks = responseActionsHttpMocks(appTestContext.coreStart.http);

    renderProps = {
      action: new EndpointActionGenerator('seed').generateActionDetails<
        ResponseActionGetFileOutputContent,
        ResponseActionGetFileParameters
      >({ command: 'get-file' }),
      'data-test-subj': 'test',
    };

    render = () => {
      renderResult = appTestContext.render(<ResponseActionFileDownloadLink {...renderProps} />);
      return renderResult;
    };
  });

  it('should show download button if file is available', async () => {
    render();
    await waitFor(() => {
      expect(apiMocks.responseProvider.fileInfo).toHaveBeenCalled();
    });

    expect(renderResult.getByTestId('test-downloadButton')).not.toBeNull();
    expect(renderResult.getByTestId('test-passcodeMessage')).toHaveTextContent(
      '(ZIP file passcode: elastic)'
    );
    expect(renderResult.getByTestId('test-fileDeleteMessage')).toHaveTextContent(
      'Files are periodically deleted to clear storage space. Download and save file locally if needed.'
    );
  });

  it('should display custom button label', async () => {
    renderProps.buttonTitle = 'hello';
    render();
    await waitFor(() => {
      expect(apiMocks.responseProvider.fileInfo).toHaveBeenCalled();
    });

    expect(renderResult.getByTestId('test-downloadButton')).toHaveTextContent('hello');
  });

  it('should show loading indicator while calling file info api', async () => {
    const deferred = getDeferred();

    apiMocks.responseProvider.fileInfo.mockDelay.mockReturnValue(deferred.promise);
    (renderProps.action as ActionDetails).completedAt = '2021-04-15T16:08:47.449Z';

    render();

    expect(renderResult.getByTestId('test-loading')).not.toBeNull();

    // Release the `file info` api
    deferred.resolve();

    await waitFor(() => {
      expect(apiMocks.responseProvider.fileInfo).toHaveBeenCalledWith({
        path: '/api/endpoint/action/123/file/123.agent-a',
      });
    });

    expect(renderResult.getByTestId('test-downloadButton')).not.toBeNull();
  });

  it('should show file no longer available message if status is DELETED', async () => {
    const fileInfoApiResponseMock = apiMocks.responseProvider.fileInfo();

    fileInfoApiResponseMock.data.status = 'DELETED';
    apiMocks.responseProvider.fileInfo.mockReturnValue(fileInfoApiResponseMock);

    (renderProps.action as ActionDetails).completedAt = '2021-04-15T16:08:47.449Z';

    render();

    await waitFor(() => {
      expect(renderResult.getByTestId('test-fileNoLongerAvailable')).toHaveTextContent(
        FILE_NO_LONGER_AVAILABLE_MESSAGE
      );
    });
  });

  it('should show file no longer available message if file info api returns 404', async () => {
    const error = { message: 'not found', response: { status: 404 } } as IHttpFetchError;

    (renderProps.action as ActionDetails).completedAt = '2021-04-15T16:08:47.449Z';
    apiMocks.responseProvider.fileInfo.mockImplementation(() => {
      throw error;
    });

    render();

    await waitFor(() => {
      expect(renderResult.getByTestId('test-fileNoLongerAvailable')).toHaveTextContent(
        FILE_NO_LONGER_AVAILABLE_MESSAGE
      );
    });
  });

  it('should show file info API error if one was encountered', async () => {
    const error = { message: 'server error', response: { status: 500 } } as IHttpFetchError;

    (renderProps.action as ActionDetails).completedAt = '2021-04-15T16:08:47.449Z';
    apiMocks.responseProvider.fileInfo.mockImplementation(() => {
      throw error;
    });

    render();

    await waitFor(() => {
      expect(renderResult.getByTestId('test-apiError')).toHaveTextContent('server error');
    });
  });

  it('should show nothing if user does not have authz', () => {
    const privileges = useUserPrivilegesMock();

    useUserPrivilegesMock.mockImplementationOnce(() => {
      return {
        ...privileges,
        endpointPrivileges: {
          ...privileges.endpointPrivileges,
          canWriteFileOperations: false,
        },
      };
    });

    render();

    expect(apiMocks.responseProvider.fileInfo).not.toHaveBeenCalled();
    expect(renderResult.container.children.length).toBe(0);
  });

  it('should show nothing if action is not complete', () => {
    const action = renderProps.action as ActionDetails;
    action.completedAt = undefined;
    action.isCompleted = false;

    render();

    expect(apiMocks.responseProvider.fileInfo).not.toHaveBeenCalled();
    expect(renderResult.container.children.length).toBe(0);
  });

  it('should show nothing if action was not successful', () => {
    const action = renderProps.action as ActionDetails;
    action.wasSuccessful = false;

    render();

    expect(apiMocks.responseProvider.fileInfo).not.toHaveBeenCalled();
    expect(renderResult.container.children.length).toBe(0);
  });
});
