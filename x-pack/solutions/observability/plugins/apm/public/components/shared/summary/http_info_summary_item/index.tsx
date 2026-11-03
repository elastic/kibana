/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { css } from '@emotion/react';
import { HttpStatusCode } from '@kbn/apm-ui-shared';
import { unit } from '@kbn/apm-common';

const urlStyles = css`
  display: inline-block;
  vertical-align: bottom;
  max-width: ${unit * 24}px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const URL_ANCHOR_CLASS_NAME = 'apmHttpInfoUrlAnchor';

const fittedUrlStyles = css`
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

interface HttpInfoProps {
  method?: string;
  status?: number;
  url?: string;
  /**
   * Fits the request to the width of its container. The URL truncates at whatever width is left
   * after the method, and the status moves below the request when both do not fit on one line.
   * Without it, the URL is capped at a fixed width that assumes a wide row.
   */
  fitToContainer?: boolean;
}

export function HttpInfoSummaryItem({ status, method, url, fitToContainer }: HttpInfoProps) {
  const { euiTheme } = useEuiTheme();

  if (!url) {
    return null;
  }

  const methodLabel = i18n.translate('xpack.apm.transactionDetails.requestMethodLabel', {
    defaultMessage: 'Request method',
  });

  if (fitToContainer) {
    return (
      <span
        css={css`
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: ${euiTheme.size.xs};
          min-width: 0;
          max-width: 100%;
        `}
      >
        <EuiBadge
          title={undefined}
          css={css`
            min-width: 0;
          `}
        >
          {/* EuiBadge truncates its text as a whole; a flex row lets only the URL give up width. */}
          <span
            css={css`
              display: flex;
              gap: ${euiTheme.size.xs};
              min-width: 0;

              .${URL_ANCHOR_CLASS_NAME} {
                min-width: 0;
              }
            `}
          >
            {method && (
              <EuiToolTip content={methodLabel}>
                <span tabIndex={0} data-test-subj="apmHttpInfoRequestMethod">
                  {method.toUpperCase()}
                </span>
              </EuiToolTip>
            )}{' '}
            <EuiToolTip content={url} display="block" anchorClassName={URL_ANCHOR_CLASS_NAME}>
              <span tabIndex={0} data-test-subj="apmHttpInfoUrl" css={fittedUrlStyles}>
                {url}
              </span>
            </EuiToolTip>
          </span>
        </EuiBadge>
        {status && <HttpStatusCode code={status} showTooltip />}
      </span>
    );
  }

  return (
    <span
      css={css`
        whitespace: nowrap;
      `}
    >
      <EuiBadge
        title={undefined}
        css={{
          marginRight: `${euiTheme.size.xs}`,
        }}
      >
        {method && (
          <EuiToolTip content={methodLabel}>
            <span tabIndex={0} data-test-subj="apmHttpInfoRequestMethod">
              {method.toUpperCase()}
            </span>
          </EuiToolTip>
        )}{' '}
        {url && (
          <EuiToolTip content={url}>
            <span tabIndex={0} data-test-subj="apmHttpInfoUrl" css={urlStyles}>
              {url}
            </span>
          </EuiToolTip>
        )}
      </EuiBadge>
      {status && <HttpStatusCode code={status} showTooltip />}
    </span>
  );
}
