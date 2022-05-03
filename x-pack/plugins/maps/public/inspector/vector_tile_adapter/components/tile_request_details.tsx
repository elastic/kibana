/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiButtonEmpty, EuiCopy, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { XJsonLang } from '@kbn/monaco';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';

interface Props {
  path: string;
  body: string;
}

export function TileRequestDetails(props: Props) {
  const consoleHref = '';
  const shouldShowDevToolsLink = false;

  function onOpenInConsoleClick() {}

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      wrap={false}
      responsive={true}
      style={{ height: '100%' }}
    >
      <EuiFlexItem grow={false}>
        <EuiSpacer size="s" />
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="m" wrap>
          <EuiFlexItem grow={false}>
            <div>
              <EuiCopy textToCopy={props.body}>
                {(copy) => (
                  <EuiButtonEmpty size="xs" flush="right" iconType="copyClipboard" onClick={copy}>
                    {i18n.translate('xpack.maps.inspector.vectorTileRequest.copyToClipboardLabel', {
                      defaultMessage: 'Copy to clipboard',
                    })}
                  </EuiButtonEmpty>
                )}
              </EuiCopy>
            </div>
          </EuiFlexItem>
          {shouldShowDevToolsLink && (
            <EuiFlexItem grow={false}>
              <div>
                <EuiButtonEmpty
                  size="xs"
                  flush="right"
                  iconType="wrench"
                  onClick={onOpenInConsoleClick}
                >
                  {i18n.translate('xpack.maps.inspector.vectorTileRequest.openInConsoleLabel', {
                    defaultMessage: 'Open in Console',
                  })}
                </EuiButtonEmpty>
              </div>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <CodeEditor
          languageId={XJsonLang.ID}
          value={props.body}
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
