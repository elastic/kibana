/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties } from 'react';
import React, { memo } from 'react';
import { EuiButtonEmpty, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import type { MaybeImmutable } from '../../../../common/endpoint/types';
import { getHostActionFileDownloadUrl } from '../../services/response_actions/get_host_action_file_download_url';
import type { ActionDetails } from '../../../../common/endpoint/types/actions';

const STYLE_INHERIT_FONT_FAMILY = Object.freeze<CSSProperties>({
  fontFamily: 'inherit',
});

const DEFAULT_BUTTON_TITLE = i18n.translate(
  'xpack.securitySolution.responseActionFileDownloadLink.downloadButtonLabel',
  { defaultMessage: 'Click here to download' }
);

export interface ResponseActionFileDownloadLinkProps {
  action: MaybeImmutable<ActionDetails>;
  buttonTitle?: string;
  'data-test-subj'?: string;
}

/**
 * Displays the download link for a file retrieved via a Response Action. The download link
 * button will only be displayed if the user has authorization to use file operations.
 *
 * NOTE: Currently displays only the link for the first host in the Action
 */
export const ResponseActionFileDownloadLink = memo<ResponseActionFileDownloadLinkProps>(
  ({ action, buttonTitle = DEFAULT_BUTTON_TITLE, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const { canWriteFileOperations } = useUserPrivileges().endpointPrivileges;

    if (!canWriteFileOperations) {
      return null;
    }

    return (
      <>
        <EuiButtonEmpty
          href={getHostActionFileDownloadUrl(action)}
          iconType="download"
          data-test-subj={getTestId('downloadButton')}
          flush="left"
          style={STYLE_INHERIT_FONT_FAMILY}
          download
        >
          <EuiText size="s">{buttonTitle}</EuiText>
        </EuiButtonEmpty>
        <EuiText
          size="s"
          className="eui-displayInline"
          data-test-subj={getTestId('passcodeMessage')}
        >
          <FormattedMessage
            id="xpack.securitySolution.responseActionFileDownloadLink.passcodeInfo"
            defaultMessage="(ZIP file passcode: {passcode})"
            values={{
              passcode: 'elastic',
            }}
          />
        </EuiText>
      </>
    );
  }
);
ResponseActionFileDownloadLink.displayName = 'ResponseActionFileDownloadLink';
