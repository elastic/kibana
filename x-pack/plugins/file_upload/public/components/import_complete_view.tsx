/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonIcon,
  EuiCallOut,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { CodeEditor, KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { getDocLinks, getHttp, getUiSettings } from '../kibana_services';
import { ImportResults } from '../importer';

const services = {
  uiSettings: getUiSettings(),
};

interface Props {
  failedPermissionCheck: boolean;
  importResults?: ImportResults;
  dataViewResp?: object;
  indexName: string;
}

const STATUS_CALLOUT_DATA_TEST_SUBJ = 'fileUploadStatusCallout';

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
                  aria-label={i18n.translate(
                    'xpack.fileUpload.importComplete.copyButtonAriaLabel',
                    {
                      defaultMessage: 'Copy to clipboard',
                    }
                  )}
                />
              )}
            </EuiCopy>
          </EuiFlexItem>
        </EuiFlexGroup>
        <div style={{ height: '200px' }}>
          <CodeEditor
            languageId="json"
            value={jsonAsString}
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
    if (this.props.failedPermissionCheck) {
      return (
        <EuiCallOut
          title={i18n.translate('xpack.fileUpload.importComplete.uploadFailureTitle', {
            defaultMessage: 'Unable to upload file',
          })}
          color="danger"
          iconType="alert"
          data-test-subj={STATUS_CALLOUT_DATA_TEST_SUBJ}
        >
          <p>
            {i18n.translate('xpack.fileUpload.importComplete.permissionFailureMsg', {
              defaultMessage:
                'You do not have permission to create or import data into index "{indexName}".',
              values: { indexName: this.props.indexName },
            })}
          </p>
          <EuiLink
            href={getDocLinks().links.maps.importGeospatialPrivileges}
            target="_blank"
            external
          >
            {i18n.translate('xpack.fileUpload.importComplete.permission.docLink', {
              defaultMessage: 'View file import permissions',
            })}
          </EuiLink>
        </EuiCallOut>
      );
    }

    if (!this.props.importResults || !this.props.importResults.success) {
      const errorMsg =
        this.props.importResults && this.props.importResults.error
          ? i18n.translate('xpack.fileUpload.importComplete.uploadFailureMsgErrorBlock', {
              defaultMessage: 'Error: {reason}',
              values: { reason: this.props.importResults.error.error.reason },
            })
          : '';
      return (
        <EuiCallOut
          title={i18n.translate('xpack.fileUpload.importComplete.uploadFailureTitle', {
            defaultMessage: 'Unable to upload file',
          })}
          color="danger"
          iconType="alert"
          data-test-subj={STATUS_CALLOUT_DATA_TEST_SUBJ}
        >
          <p>{errorMsg}</p>
        </EuiCallOut>
      );
    }

    const successMsg = i18n.translate('xpack.fileUpload.importComplete.uploadSuccessMsg', {
      defaultMessage: 'Indexed {numFeatures} features.',
      values: {
        numFeatures: this.props.importResults.docCount,
      },
    });

    const failedFeaturesMsg = this.props.importResults.failures?.length
      ? i18n.translate('xpack.fileUpload.importComplete.failedFeaturesMsg', {
          defaultMessage: 'Unable to index {numFailures} features.',
          values: {
            numFailures: this.props.importResults.failures.length,
          },
        })
      : '';

    return (
      <EuiCallOut
        title={i18n.translate('xpack.fileUpload.importComplete.uploadSuccessTitle', {
          defaultMessage: 'File upload complete',
        })}
        data-test-subj={STATUS_CALLOUT_DATA_TEST_SUBJ}
      >
        <p>{`${successMsg} ${failedFeaturesMsg}`}</p>
      </EuiCallOut>
    );
  }

  _renderIndexManagementMsg() {
    return this.props.importResults && this.props.importResults.success ? (
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.fileUpload.importComplete.indexModsMsg"
            defaultMessage="To modify the index, go to "
          />
          <a
            data-test-subj="indexManagementNewIndexLink"
            target="_blank"
            href={getHttp().basePath.prepend('/app/management/kibana/dataViews')}
          >
            <FormattedMessage
              id="xpack.fileUpload.importComplete.indexMgmtLink"
              defaultMessage="Index Management."
            />
          </a>
        </p>
      </EuiText>
    ) : null;
  }

  render() {
    return (
      <KibanaContextProvider services={services}>
        {this._getStatusMsg()}

        {this._renderCodeEditor(
          this.props.importResults,
          i18n.translate('xpack.fileUpload.importComplete.indexingResponse', {
            defaultMessage: 'Import response',
          }),
          'indexRespCopyButton'
        )}
        {this._renderCodeEditor(
          this.props.dataViewResp,
          i18n.translate('xpack.fileUpload.importComplete.dataViewResponse', {
            defaultMessage: 'Data view response',
          }),
          'dataViewRespCopyButton'
        )}
        {this._renderIndexManagementMsg()}
      </KibanaContextProvider>
    );
  }
}
