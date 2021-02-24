/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { CodeEditor, KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { getHttp, getUiSettings } from '../kibana_services';
import { ImportResponse } from '../../common';

const services = {
  uiSettings: getUiSettings(),
};

interface Props {
  importResp?: ImportResponse;
  indexPatternResp?: unknown;
}

export class ImportCompleteView extends Component<Props, {}> {
  _renderCodeEditor(value: unknown) {
    return (
      <div style={{ height: '200px' }}>
        <CodeEditor
          languageId="json"
          value={JSON.stringify(value, null, 2)}
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
    );
  }

  _renderIndexResp() {
    if (!this.props.importResp) {
      return null;
    }

    return (
      <Fragment>
        <EuiTitle size="xxs">
          <h4>
            <FormattedMessage
              id="xpack.fileUpload.jsonImport.indexingResponse"
              defaultMessage="Import response"
            />
          </h4>
        </EuiTitle>
        {this._renderCodeEditor(this.props.importResp)}
        <EuiSpacer size="m" />
      </Fragment>
    );
  }

  _renderIndexPatternResp() {
    if (!this.props.indexPatternResp) {
      return null;
    }

    return (
      <Fragment>
        <EuiTitle size="xxs">
          <h4>
            <FormattedMessage
              id="xpack.fileUpload.jsonImport.indexPatternResponse"
              defaultMessage="Index pattern response"
            />
          </h4>
        </EuiTitle>
        {this._renderCodeEditor(this.props.indexPatternResp)}
        <EuiSpacer size="m" />
      </Fragment>
    );
  }

  _getStatusMsg() {
    if (!this.props.importResp || !this.props.importResp.success) {
      return i18n.translate('xpack.fileUpload.uploadFailureMsg', {
        defaultMessage: 'File upload failed.',
      });
    }

    const successMsg = i18n.translate('xpack.fileUpload.uploadSuccessMsg', {
      defaultMessage: 'File upload complete: indexed {numFeatures} features.',
      values: {
        numFeatures: this.props.importResp.docCount,
      },
    });

    const failuredFeaturesMsg = this.props.importResp.failures.length
      ? i18n.translate('xpack.fileUpload.failedFeaturesMsg', {
          defaultMessage: 'Unable to index {numFailures} features.',
          values: {
            numFailures: this.props.importResp.failures.length,
          },
        })
      : '';

    return `${successMsg} ${failuredFeaturesMsg}`;
  }

  render() {
    return (
      <KibanaContextProvider services={services}>
        <EuiText>
          <p>{this._getStatusMsg()}</p>
        </EuiText>
        {this._renderIndexResp()}
        {this._renderIndexPatternResp()}
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
