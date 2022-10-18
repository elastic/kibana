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
import type { MaybeImmutable } from '../../../../common/endpoint/types';
import { getHostActionFileDownloadUrl } from '../../services/response_actions/get_host_action_file_download_url';
import type { ActionDetails } from '../../../../common/endpoint/types/actions';

const PASSCODE_VALUE = Object.freeze({
  passcode: 'elastic',
});

const STYLE_INHERIT_FONT_FAMILY = Object.freeze<CSSProperties>({
  fontFamily: 'inherit',
});

export interface ResponseActionFileDownloadLinkProps {
  action: MaybeImmutable<ActionDetails>;
}

/**
 * Displays the download link for a file retrieved via a Response Action.
 *
 * NOTE: Currently displays only the link for the first host in the Action
 */
export const ResponseActionFileDownloadLink = memo<ResponseActionFileDownloadLinkProps>(
  ({ action }) => {
    return (
      <>
        <EuiButtonEmpty
          href={getHostActionFileDownloadUrl(action)}
          iconType="download"
          data-test-subj="fileDownloadLink"
          flush="left"
          style={STYLE_INHERIT_FONT_FAMILY}
          download
        >
          <EuiText size="s">
            <FormattedMessage
              id="xpack.securitySolution.responseActionFileDownloadLink.downloadButtonLabel"
              defaultMessage="Click here to download"
            />
          </EuiText>
        </EuiButtonEmpty>
        <EuiText size="s" className="eui-displayInline">
          <FormattedMessage
            id="xpack.securitySolution.responseActionFileDownloadLink.passcodeInfo"
            defaultMessage="(ZIP file passcode: {passcode})"
            values={PASSCODE_VALUE}
          />
        </EuiText>
      </>
    );
  }
);
ResponseActionFileDownloadLink.displayName = 'ResponseActionFileDownloadLink';
