/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { useApmPluginContext } from '../../../../hooks/useApmPluginContext';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { getAPMHref } from '../../../shared/Links/apm/APMLink';

export function CopyTraceLink({ transaction }: { transaction: ITransaction }) {
  const { core } = useApmPluginContext();
  const { basePath } = core.http;
  const toasts = useKibana().services.notifications?.toasts;
  const textToCopy = getAPMHref({
    basePath,
    path: `/link-to/trace/${transaction.trace.id}`,
  });

  const onClick = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      try {
        await navigator.clipboard.writeText(textToCopy);
      } catch (error) {
        if (toasts) {
          toasts.addError(error, {
            title: i18n.translate(
              'xpack.apm.transactionDetails.copyTraceSampleFailureTitle',
              {
                defaultMessage: 'Unable to copy trace url to clipboard',
              }
            ),
          });
        }
      }
    },
    [textToCopy, toasts]
  );

  return (
    <EuiFlexGroup>
      <EuiFlexItem style={{ flexDirection: 'row', alignItems: 'center' }}>
        <EuiText size="xs">{transaction.trace.id.substring(0, 10)}</EuiText>
        <EuiToolTip
          content={i18n.translate(
            'xpack.apm.transactionDetails.traceLinkCopyToClipboard',
            {
              defaultMessage: 'Copy Trace Link to Clipboard',
            }
          )}
        >
          <EuiButtonIcon
            aria-label={i18n.translate(
              'xpack.apm.transactionDetails.traceLinkCopyToClipboard',
              {
                defaultMessage: 'Copy Trace Link to Clipboard',
              }
            )}
            color="text"
            iconType="copyClipboard"
            onClick={onClick}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
