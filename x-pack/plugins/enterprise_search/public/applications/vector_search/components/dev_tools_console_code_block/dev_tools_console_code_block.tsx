/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';
import { compressToEncodedURIComponent } from 'lz-string';

import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiCodeBlockProps,
  EuiCopy,
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiPanel,
  EuiThemeProvider,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { KibanaLogic } from '../../../shared/kibana';

export type DevToolsConsoleCodeBlockProps = EuiCodeBlockProps & {
  children: string;
};

export const DevToolsConsoleCodeBlock: React.FC<DevToolsConsoleCodeBlockProps> = ({
  children,
  ...props
}) => {
  const {
    application,
    share: { url },
  } = useValues(KibanaLogic);

  const consolePreviewLink =
    !!application?.capabilities?.dev_tools?.show &&
    url.locators
      .get('CONSOLE_APP_LOCATOR')
      ?.useUrl(
        { loadFrom: `data:text/plain,${compressToEncodedURIComponent(children)}` },
        undefined,
        []
      );

  return (
    <EuiThemeProvider colorMode="dark">
      <EuiPanel hasShadow={false}>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexGroup direction="rowReverse" gutterSize="s">
            {consolePreviewLink && (
              <EuiButtonEmpty
                iconType="popout"
                color="success"
                href={consolePreviewLink}
                target="_blank"
              >
                <FormattedMessage
                  id="xpack.enterpriseSearch.component.devToolsConsoleCodeBlock.tryInConsole"
                  defaultMessage="Try in Console"
                />
              </EuiButtonEmpty>
            )}
            <EuiCopy textToCopy={children}>
              {(copy) => (
                <EuiButtonEmpty iconType="copyClipboard" onClick={copy} color="text">
                  <FormattedMessage
                    id="xpack.enterpriseSearch.component.devToolsConsoleCodeBlock.copy"
                    defaultMessage="Copy"
                  />
                </EuiButtonEmpty>
              )}
            </EuiCopy>
          </EuiFlexGroup>
          <EuiHorizontalRule margin="xs" />
          <EuiCodeBlock
            paddingSize="s"
            fontSize="m"
            transparentBackground
            color="subduedText"
            {...props}
          >
            {children}
          </EuiCodeBlock>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiThemeProvider>
  );
};
