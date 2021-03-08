/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiCallOut,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { CodeEditor, KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { getHttp, getUiSettings } from '../kibana_services';
import { ImportResults } from '../importer';

const services = {
  uiSettings: getUiSettings(),
};

interface Props {
  importResults?: ImportResults;
  indexPatternResp?: object;
}

export class ImportCompleteView extends Component<Props, {}> {
  _renderCodeEditor(json: object | undefined, title: string, copyButtonDataTestSubj: string) {
    if (!json) {
      return null;
    }

    const jsonAsString = JSON.stringify(json, null, 2);

    return (
      <Fragment>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h4>{title}</h4>
            </EuiTitle>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiCopy textToCopy={jsonAsString}>
              {(copy) => (
                <EuiButtonIcon
                  size="s"
                  onClick={copy}
                  iconType="copy"
                  color="text"
                  data-test-subj={copyButtonDataTestSubj}
                  aria-label={i18n.translate('xpack.fileUpload.copyButtonAriaLabel', {
                    defaultMessage: 'Copy to clipboard',
                  })}
                />
              )}
            </EuiCopy>
          </EuiFlexItem>
        </EuiFlexGroup>
        <div style={{ height: '200px' }}>
          <CodeEditor
            languageId="json"
            value={jsonAsString}
            onChange={() => {}}
            options={{
              readOnly: true,
              lineNumbers: 'off',
              fontSize: 12,
              minimap: {
                enabled: false,
              },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              wrappingIndent: 'indent',
              automaticLayout: true,
            }}
          />
        </div>
        <EuiSpacer size="m" />
      </Fragment>
    );
  }

  _getStatusMsg() {
    if (!this.props.importResults || !this.props.importResults.success) {
      return i18n.translate('xpack.fileUpload.uploadFailureMsg', {
        defaultMessage: 'File upload failed.',
      });
    }

    const successMsg = i18n.translate('xpack.fileUpload.uploadSuccessMsg', {
      defaultMessage: 'File upload complete: indexed {numFeatures} features.',
      values: {
        numFeatures: this.props.importResults.docCount,
      },
    });

    const failedFeaturesMsg = this.props.importResults.failures?.length
      ? i18n.translate('xpack.fileUpload.failedFeaturesMsg', {
          defaultMessage: 'Unable to index {numFailures} features.',
          values: {
            numFailures: this.props.importResults.failures.length,
          },
        })
      : '';

    return `${successMsg} ${failedFeaturesMsg}`;
  }

  render() {
    return (
      <KibanaContextProvider services={services}>
        <EuiText>
          <p>{this._getStatusMsg()}</p>
        </EuiText>
        {this._renderCodeEditor(
          this.props.importResults,
          i18n.translate('xpack.fileUpload.jsonImport.indexingResponse', {
            defaultMessage: 'Import response',
          }),
          'indexRespCopyButton'
        )}
        {this._renderCodeEditor(
          this.props.indexPatternResp,
          i18n.translate('xpack.fileUpload.jsonImport.indexPatternResponse', {
            defaultMessage: 'Index pattern response',
          }),
          'indexPatternRespCopyButton'
        )}
        <EuiCallOut>
          <div>
            <FormattedMessage
              id="xpack.fileUpload.jsonImport.indexModsMsg"
              defaultMessage="Further index modifications can be made using "
            />
            <a
              data-test-subj="indexManagementNewIndexLink"
              target="_blank"
              href={getHttp().basePath.prepend('/app/management/kibana/indexPatterns')}
            >
              <FormattedMessage
                id="xpack.fileUpload.jsonImport.indexMgmtLink"
                defaultMessage="Index Management"
              />
            </a>
          </div>
        </EuiCallOut>
      </KibanaContextProvider>
    );
  }
}
