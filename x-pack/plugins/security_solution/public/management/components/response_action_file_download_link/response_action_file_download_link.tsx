/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, type CSSProperties } from 'react';
import { EuiButtonEmpty, EuiLoadingContent, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { getFileDownloadId } from '../../../../common/endpoint/service/response_actions/get_file_download_id';
import { resolvePathVariables } from '../../../common/utils/resolve_path_variables';
import { FormattedError } from '../formatted_error';
import { useGetFileInfo } from '../../hooks/response_actions/use_get_file_info';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import type { MaybeImmutable } from '../../../../common/endpoint/types';
import type { ActionDetails } from '../../../../common/endpoint/types/actions';
import { ACTION_AGENT_FILE_DOWNLOAD_ROUTE } from '../../../../common/endpoint/constants';

const STYLE_INHERIT_FONT_FAMILY = Object.freeze<CSSProperties>({
  fontFamily: 'inherit',
});

const DEFAULT_BUTTON_TITLE = i18n.translate(
  'xpack.securitySolution.responseActionFileDownloadLink.downloadButtonLabel',
  { defaultMessage: 'Click here to download' }
);

export const FILE_NO_LONGER_AVAILABLE_MESSAGE = i18n.translate(
  'xpack.securitySolution.responseActionFileDownloadLink.fileNoLongerAvailable',
  { defaultMessage: 'File has expired and is no longer available for download.' }
);

const FileDownloadLinkContainer = styled.div`
  & > * {
    vertical-align: middle;
  }
`;

export interface ResponseActionFileDownloadLinkProps {
  action: MaybeImmutable<ActionDetails>;
  /** If left undefined, the first agent that the action was sent to will be used */
  agentId?: string;
  buttonTitle?: string;
  'data-test-subj'?: string;
  textSize?: 's' | 'xs';
}

/**
 * Displays the download link for a file retrieved via a Response Action. The download link
 * button will only be displayed if the user has authorization to use file operations.
 *
 * NOTE: Currently displays only the link for the first host in the Action
 */
export const ResponseActionFileDownloadLink = memo<ResponseActionFileDownloadLinkProps>(
  ({
    action: _action,
    agentId,
    buttonTitle = DEFAULT_BUTTON_TITLE,
    'data-test-subj': dataTestSubj,
    textSize = 's',
  }) => {
    const action = _action as ActionDetails; // cast to remove `Immutable`
    const getTestId = useTestIdGenerator(dataTestSubj);
    const { canWriteFileOperations } = useUserPrivileges().endpointPrivileges;

    const shouldFetchFileInfo: boolean = useMemo(() => {
      return action.isCompleted && action.wasSuccessful;
    }, [action.isCompleted, action.wasSuccessful]);

    const downloadUrl: string = useMemo(() => {
      return resolvePathVariables(ACTION_AGENT_FILE_DOWNLOAD_ROUTE, {
        action_id: action.id,
        file_id: getFileDownloadId(action, agentId),
      });
    }, [action, agentId]);

    const {
      isFetching,
      data: fileInfo,
      error,
    } = useGetFileInfo(action, undefined, {
      enabled: canWriteFileOperations && shouldFetchFileInfo,
    });

    if (!canWriteFileOperations || !action.isCompleted || !action.wasSuccessful) {
      return null;
    }

    if (isFetching) {
      return <EuiLoadingContent lines={1} data-test-subj={getTestId('loading')} />;
    }

    // Check if file is no longer available
    if ((error && error?.response?.status === 404) || fileInfo?.data.status === 'DELETED') {
      return (
        <EuiText size={textSize} data-test-subj={getTestId('fileNoLongerAvailable')}>
          {FILE_NO_LONGER_AVAILABLE_MESSAGE}
        </EuiText>
      );
    } else if (error) {
      return <FormattedError error={error} data-test-subj={getTestId('apiError')} />;
    }

    return (
      <FileDownloadLinkContainer data-test-subj={dataTestSubj}>
        <EuiButtonEmpty
          href={downloadUrl}
          iconType="download"
          data-test-subj={getTestId('downloadButton')}
          flush="left"
          style={STYLE_INHERIT_FONT_FAMILY}
          iconSize="s"
          download
        >
          <EuiText size={textSize}>{buttonTitle}</EuiText>
        </EuiButtonEmpty>
        <EuiText
          size={textSize}
          data-test-subj={getTestId('passcodeMessage')}
          className="eui-displayInline"
        >
          <FormattedMessage
            id="xpack.securitySolution.responseActionFileDownloadLink.passcodeInfo"
            defaultMessage="(ZIP file passcode: {passcode})."
            values={{
              passcode: 'elastic',
            }}
          />
        </EuiText>
        <EuiText size={textSize} data-test-subj={getTestId('fileDeleteMessage')}>
          <FormattedMessage
            id="xpack.securitySolution.responseActionFileDownloadLink.deleteNotice"
            defaultMessage="Files are periodically deleted to clear storage space. Download and save file locally if needed."
          />
        </EuiText>
      </FileDownloadLinkContainer>
    );
  }
);
ResponseActionFileDownloadLink.displayName = 'ResponseActionFileDownloadLink';
