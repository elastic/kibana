/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { XJsonLang } from '@kbn/monaco';
import { CodeEditor } from '@kbn/code-editor';
import { compressToEncodedURIComponent } from 'lz-string';
import {
  getDevToolsCapabilities,
  getNavigateToUrl,
  getShareService,
} from '../../../kibana_services';
import type { TileRequest } from '../types';
import { getTileRequest } from './get_tile_request';

interface Props {
  tileRequest: TileRequest;
}

export function TileRequestTab(props: Props) {
  try {
    const { path, body } = getTileRequest(props.tileRequest);
    const consoleRequest = `POST ${path}\n${JSON.stringify(body, null, 2)}`;
    let consoleHref: string | undefined;
    if (getDevToolsCapabilities().show) {
      const devToolsDataUri = compressToEncodedURIComponent(consoleRequest);
      consoleHref = getShareService()
        .url.locators.get('CONSOLE_APP_LOCATOR')
        ?.useUrl({ loadFrom: `data:text/plain,${devToolsDataUri}` });
    }
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
                <EuiCopy textToCopy={consoleRequest}>
                  {(copy) => (
                    <EuiButtonEmpty size="xs" flush="right" iconType="copyClipboard" onClick={copy}>
                      {i18n.translate(
                        'xpack.maps.inspector.vectorTileRequest.copyToClipboardLabel',
                        {
                          defaultMessage: 'Copy to clipboard',
                        }
                      )}
                    </EuiButtonEmpty>
                  )}
                </EuiCopy>
              </div>
            </EuiFlexItem>
            {consoleHref !== undefined && (
              <EuiFlexItem grow={false}>
                <div>
                  <EuiButtonEmpty
                    size="xs"
                    flush="right"
                    onClick={() => {
                      const navigateToUrl = getNavigateToUrl();
                      navigateToUrl(consoleHref!);
                    }}
                    iconType="wrench"
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
            value={consoleRequest}
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
  } catch (e) {
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
              tileUrl: props.tileRequest.tileUrl,
              error: e.message,
            },
          })}
        </p>
      </EuiCallOut>
    );
  }
}
