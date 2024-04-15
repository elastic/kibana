/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiCodeBlockProps,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiThemeProvider,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { TryInConsoleButton } from '@kbn/search-api-panels';

import { KibanaLogic } from '../../../shared/kibana';

export type DevToolsConsoleCodeBlockProps = EuiCodeBlockProps & {
  children: string;
};

export const DevToolsConsoleCodeBlock: React.FC<DevToolsConsoleCodeBlockProps> = ({
  children,
  ...props
}) => {
  const { application, consolePlugin, share } = useValues(KibanaLogic);

  const showConsoleLink = !!application?.capabilities?.dev_tools?.show;

  return (
    <EuiThemeProvider colorMode="dark">
      <EuiPanel hasShadow={false}>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexGroup
            direction="rowReverse"
            gutterSize="s"
            alignItems="center"
            responsive={false}
          >
            {showConsoleLink && (
              <EuiFlexItem grow={false}>
                <TryInConsoleButton
                  request={children}
                  application={application}
                  consolePlugin={consolePlugin ?? undefined}
                  sharePlugin={share ?? undefined}
                />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiCopy textToCopy={children}>
                {(copy) => (
                  <EuiButtonEmpty color="text" iconType="copyClipboard" size="s" onClick={copy}>
                    <FormattedMessage
                      id="xpack.enterpriseSearch.component.devToolsConsoleCodeBlock.copy"
                      defaultMessage="Copy"
                    />
                  </EuiButtonEmpty>
                )}
              </EuiCopy>
            </EuiFlexItem>
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
