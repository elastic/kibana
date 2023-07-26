/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  useEuiTheme,
  EuiCallOut,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface FlyoutWrapperProps {
  datasourceId: 'formBased' | 'textBased';
  children: JSX.Element;
  closeFlyout?: () => void;
}
export const FlyoutWrapper = ({ datasourceId, children, closeFlyout }: FlyoutWrapperProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      <EuiFlyoutBody
        className="lnsEditFlyoutBody"
        css={css`
          .euiFlyoutBody__overflowContent {
            padding: ${euiTheme.size.s};
          }
        `}
      >
        {datasourceId === 'textBased' && (
          <EuiCallOut
            size="s"
            title={i18n.translate('xpack.lens.config.configFlyoutCallout', {
              defaultMessage: 'SQL currently offers limited configuration options',
            })}
            iconType="iInCircle"
          />
        )}
        {children}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButtonEmpty
          onClick={closeFlyout}
          data-test-subj="collapseFlyoutButton"
          aria-controls="lens-config-close-button"
          aria-expanded="true"
          aria-label={i18n.translate('xpack.lens.config.closeFlyoutAriaLabel', {
            defaultMessage: 'Close flyout',
          })}
        >
          <FormattedMessage id="xpack.lens.config.closeFlyoutLabel" defaultMessage="Close" />
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </>
  );
};
