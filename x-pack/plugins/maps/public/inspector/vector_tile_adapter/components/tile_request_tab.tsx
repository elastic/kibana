/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { Component } from 'react';
import { EuiButtonEmpty, EuiCallOut, EuiCopy, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { XJsonLang } from '@kbn/monaco';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import type { TileRequest } from '../types';
import { getTileRequest } from './get_tile_request';

interface Props {
  tileRequest: TileRequest;
}

interface State {
  path?: string;
  body?: string;
  error?: string;
}

export class TileRequestTab extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    try {
      const { path, body } = getTileRequest(this.props.tileRequest);
      this.state = {
        path,
        body: JSON.stringify(body, null, 2),
      };
    } catch (e) {
      this.state = {
        error: e.message,
      };
    }
  }

  render() {
    if (!this.state.path || !this.state.body) {
      return (
        <EuiCallOut
          title={i18n.translate('xpack.maps.inspector.vectorTileRequest.errorMessage', {
            defaultMessage: 'Unable to create Elasticsearch vector tile search request',
          })}
          color="warning"
          iconType="help"
        >
          <p>
            {i18n.translate('xpack.maps.inspector.vectorTileRequest.errorTitle', {
              defaultMessage: `Could not convert tile request, '{tileUrl}', to Elasticesarch vector tile search request, error: {error}`,
              values: {
                tileUrl: this.props.tileRequest.tileUrl,
                error: this.state.error,
              },
            })}
          </p>
        </EuiCallOut>
      );
    }

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
                <EuiCopy textToCopy={this.state.body}>
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
            value={this.state.body}
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
}
