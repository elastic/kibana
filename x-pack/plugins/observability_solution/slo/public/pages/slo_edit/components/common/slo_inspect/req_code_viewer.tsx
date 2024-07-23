/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @elastic/eui/href-or-on-click */

import { EuiButtonEmpty, EuiCopy, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { XJsonLang } from '@kbn/monaco';
import React, { ReactNode, useCallback } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { compressToEncodedURIComponent } from 'lz-string';
import { useKibana } from '../../../../../utils/kibana_react';

interface RequestCodeViewerProps {
  value: string;
}

const copyToClipboardLabel = i18n.translate('xpack.slo.requests.copyToClipboardLabel', {
  defaultMessage: 'Copy to clipboard',
});

export function RequestCodeViewer({ value }: RequestCodeViewerProps) {
  const {
    application: { navigateToUrl },
    share: {
      url: { locators },
    },
  } = useKibana().services;

  // "Open in Console" button
  const devToolsDataUri = compressToEncodedURIComponent(value);
  const consoleHref = locators
    .get('CONSOLE_APP_LOCATOR')
    ?.useUrl({ loadFrom: `data:text/plain,${devToolsDataUri}` });

  const handleDevToolsLinkClick = useCallback(
    () => consoleHref && navigateToUrl && navigateToUrl(consoleHref),
    [consoleHref, navigateToUrl]
  );

  const actions: Array<{ name: string; action: ReactNode }> = [];

  actions.push({
    name: 'openInConsole',
    action: (
      <EuiButtonEmpty
        size="xs"
        flush="right"
        iconType="wrench"
        href={consoleHref}
        onClick={handleDevToolsLinkClick}
        data-test-subj="inspectorRequestOpenInConsoleButton"
      >
        {openInConsoleLabel}
      </EuiButtonEmpty>
    ),
  });

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      wrap={false}
      responsive={false}
      css={{ height: 800 }}
    >
      <EuiFlexItem grow={false}>
        <EuiSpacer size="s" />
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="m" wrap>
          <EuiFlexItem grow={false}>
            <div>
              <EuiCopy textToCopy={value}>
                {(copy) => (
                  <EuiButtonEmpty
                    size="xs"
                    flush="right"
                    iconType="copyClipboard"
                    onClick={copy}
                    data-test-subj="inspectorRequestCopyClipboardButton"
                  >
                    {copyToClipboardLabel}
                  </EuiButtonEmpty>
                )}
              </EuiCopy>
            </div>
          </EuiFlexItem>
          {!!actions &&
            actions.map((item) => (
              <EuiFlexItem grow={false} key={item.name}>
                <div>{item.action}</div>
              </EuiFlexItem>
            ))}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={true} data-test-subj="inspectorRequestCodeViewerContainer">
        <CodeEditor
          languageId={XJsonLang.ID}
          value={value}
          options={{
            readOnly: true,
            lineNumbers: 'off',
            fontSize: 12,
            minimap: {
              enabled: false,
            },
            folding: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            wrappingIndent: 'indent',
            automaticLayout: true,
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

const openInConsoleLabel = i18n.translate('xpack.slo.requests.openInConsoleLabel', {
  defaultMessage: 'Open in Console',
});
