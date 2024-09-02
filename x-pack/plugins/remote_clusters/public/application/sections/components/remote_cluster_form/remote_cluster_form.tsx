/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component, Fragment } from 'react';
import { merge } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiLoadingLogo,
  EuiOverlayMask,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
  EuiDelayRender,
  EuiScreenReaderOnly,
  htmlIdGenerator,
  EuiSwitchEvent,
} from '@elastic/eui';

import { Cluster, ClusterPayload } from '../../../../../common/lib';
import { SNIFF_MODE, PROXY_MODE } from '../../../../../common/constants';

import { AppContext, Context } from '../../../app_context';

import { skippingDisconnectedClustersUrl } from '../../../services/documentation';

import { RequestFlyout } from './request_flyout';
import { ConnectionMode } from './components';
import {
  ClusterErrors,
  convertCloudRemoteAddressToProxyConnection,
  validateCluster,
  isCloudAdvancedOptionsEnabled,
} from './validators';

const defaultClusterValues: ClusterPayload = {
  name: '',
  seeds: [],
  skipUnavailable: true,
  nodeConnections: 3,
  proxyAddress: '',
  proxySocketConnections: 18,
  serverName: '',
};

const ERROR_TITLE_ID = 'removeClustersErrorTitle';
const ERROR_LIST_ID = 'removeClustersErrorList';

interface Props {
  save: (cluster: ClusterPayload) => void;
  cancel?: () => void;
  isSaving?: boolean;
  saveError?: any;
  cluster?: Cluster;
}

export type FormFields = ClusterPayload & {
  cloudRemoteAddress?: string;
  cloudAdvancedOptionsEnabled: boolean;
};

interface State {
  fields: FormFields;
  fieldsErrors: ClusterErrors;
  areErrorsVisible: boolean;
  isRequestVisible: boolean;
}

export class RemoteClusterForm extends Component<Props, State> {
  static defaultProps = {
    fields: merge({}, defaultClusterValues),
  };

  static contextType = AppContext;
  private readonly generateId: (idSuffix?: string) => string;

  constructor(props: Props, context: Context) {
    super(props, context);

    const { cluster } = props;
    const { isCloudEnabled } = context;

    // Connection mode should default to "proxy" in cloud
    const defaultMode = isCloudEnabled ? PROXY_MODE : SNIFF_MODE;
    const fieldsState: FormFields = merge(
      {},
      {
        ...defaultClusterValues,
        mode: defaultMode,
        cloudRemoteAddress: cluster?.proxyAddress || '',
        cloudAdvancedOptionsEnabled: isCloudAdvancedOptionsEnabled(cluster),
      },
      cluster
    );

    this.generateId = htmlIdGenerator();
    this.state = {
      fields: fieldsState,
      fieldsErrors: validateCluster(fieldsState, isCloudEnabled),
      areErrorsVisible: false,
      isRequestVisible: false,
    };
  }

  toggleRequest = () => {
    this.setState(({ isRequestVisible }) => ({
      isRequestVisible: !isRequestVisible,
    }));
  };

  onFieldsChange = (changedFields: Partial<FormFields>) => {
    const { isCloudEnabled } = this.context;

    // when cloud remote address changes, fill proxy address and server name
    const { cloudRemoteAddress, cloudAdvancedOptionsEnabled } = changedFields;
    if (cloudRemoteAddress) {
      const { proxyAddress, serverName } =
        convertCloudRemoteAddressToProxyConnection(cloudRemoteAddress);
      // Only change the server name if the advanced options are not currently open
      if (this.state.fields.cloudAdvancedOptionsEnabled) {
        changedFields = {
          ...changedFields,
          proxyAddress,
        };
      } else {
        changedFields = {
          ...changedFields,
          proxyAddress,
          serverName,
        };
      }
    }

    // If we switch off the advanced options, revert the server name to
    // the host name from the proxy address
    if (cloudAdvancedOptionsEnabled === false) {
      changedFields = {
        ...changedFields,
        serverName: this.state.fields.proxyAddress?.split(':')[0],
        proxySocketConnections: defaultClusterValues.proxySocketConnections,
      };
    }

    this.setState(({ fields: prevFields }) => {
      const newFields = {
        ...prevFields,
        ...changedFields,
      };
      return {
        fields: newFields,
        fieldsErrors: validateCluster(newFields, isCloudEnabled),
      };
    });
  };

  getCluster(): ClusterPayload {
    const {
      fields: {
        name,
        mode,
        seeds,
        nodeConnections,
        proxyAddress,
        proxySocketConnections,
        serverName,
        skipUnavailable,
      },
    } = this.state;
    const { cluster } = this.props;

    let modeSettings;

    if (mode === PROXY_MODE) {
      modeSettings = {
        proxyAddress,
        proxySocketConnections,
        serverName,
      };
    } else {
      modeSettings = {
        seeds,
        nodeConnections,
      };
    }

    return {
      name,
      skipUnavailable,
      mode,
      hasDeprecatedProxySetting: cluster?.hasDeprecatedProxySetting,
      ...modeSettings,
    };
  }

  save = () => {
    const { save } = this.props;

    if (this.hasErrors()) {
      this.setState({
        areErrorsVisible: true,
      });
      return;
    }

    const cluster = this.getCluster();
    save(cluster);
  };

  onSkipUnavailableChange = (e: EuiSwitchEvent) => {
    const skipUnavailable = e.target.checked;
    this.onFieldsChange({ skipUnavailable });
  };

  resetToDefault = (fieldName: keyof ClusterPayload) => {
    this.onFieldsChange({
      [fieldName]: defaultClusterValues[fieldName],
    });
  };

  hasErrors = () => {
    const { fieldsErrors } = this.state;
    const errorValues = Object.values(fieldsErrors);
    return errorValues.some((error) => error != null);
  };

  renderSkipUnavailable() {
    const {
      fields: { skipUnavailable },
    } = this.state;

    return (
      <EuiDescribedFormGroup
        title={
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.sectionSkipUnavailableTitle"
                defaultMessage="Make remote cluster optional"
              />
            </h2>
          </EuiTitle>
        }
        description={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.sectionSkipUnavailableDescription"
                defaultMessage="If any of the remote clusters are unavailable, the query request fails. To avoid this and continue to send requests to other clusters, enable {optionName}. {learnMoreLink}"
                values={{
                  optionName: (
                    <strong>
                      <FormattedMessage
                        id="xpack.remoteClusters.remoteClusterForm.sectionSkipUnavailableDescription.optionNameLabel"
                        defaultMessage="Skip if unavailable"
                      />
                    </strong>
                  ),
                  learnMoreLink: (
                    <EuiLink href={skippingDisconnectedClustersUrl} target="_blank">
                      <FormattedMessage
                        id="xpack.remoteClusters.remoteClusterForm.sectionSkipUnavailableDescription.learnMoreLinkLabel"
                        defaultMessage="Learn more."
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </Fragment>
        }
        fullWidth
      >
        <EuiFormRow
          data-test-subj="remoteClusterFormSkipUnavailableFormRow"
          className="remoteClusterSkipIfUnavailableSwitch"
          fullWidth
          helpText={
            skipUnavailable !== defaultClusterValues.skipUnavailable ? (
              <EuiLink
                onClick={() => {
                  this.resetToDefault('skipUnavailable');
                }}
              >
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.sectionSkipUnavailableResetLabel"
                  defaultMessage="Reset to default"
                />
              </EuiLink>
            ) : null
          }
        >
          <EuiSwitch
            label={i18n.translate(
              'xpack.remoteClusters.remoteClusterForm.sectionSkipUnavailableLabel',
              {
                defaultMessage: 'Skip if unavailable',
              }
            )}
            checked={!!skipUnavailable}
            onChange={this.onSkipUnavailableChange}
            data-test-subj="remoteClusterFormSkipUnavailableFormToggle"
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  }

  renderActions() {
    const { isSaving, cancel, cluster: isEditMode } = this.props;
    const { areErrorsVisible, isRequestVisible } = this.state;
    const isSaveDisabled = (areErrorsVisible && this.hasErrors()) || isSaving;

    return (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        {cancel && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty color="primary" onClick={cancel}>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}

        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={this.toggleRequest}
                data-test-subj="remoteClustersRequestButton"
              >
                {isRequestVisible ? (
                  <FormattedMessage
                    id="xpack.remoteClusters.remoteClusterForm.hideRequestButtonLabel"
                    defaultMessage="Hide request"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.remoteClusters.remoteClusterForm.showRequestButtonLabel"
                    defaultMessage="Show request"
                  />
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="remoteClusterFormSaveButton"
                color="primary"
                onClick={this.save}
                fill
                isDisabled={isSaveDisabled}
                isLoading={isSaving}
                aria-describedby={`${this.generateId(ERROR_TITLE_ID)} ${this.generateId(
                  ERROR_LIST_ID
                )}`}
              >
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.nextButtonLabel"
                  defaultMessage="{isEditMode, select, true{Save} other{Next}}"
                  values={{
                    isEditMode: Boolean(isEditMode),
                  }}
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  renderSavingFeedback() {
    if (this.props.isSaving) {
      return (
        <EuiOverlayMask>
          <EuiLoadingLogo logo="logoKibana" size="xl" />
        </EuiOverlayMask>
      );
    }

    return null;
  }

  renderSaveErrorFeedback() {
    const { saveError } = this.props;

    if (saveError) {
      const { message, cause } = saveError;

      let errorBody;

      if (cause && Array.isArray(cause)) {
        if (cause.length === 1) {
          errorBody = <p>{cause[0]}</p>;
        } else {
          errorBody = (
            <ul>
              {cause.map((causeValue) => (
                <li key={causeValue}>{causeValue}</li>
              ))}
            </ul>
          );
        }
      }

      return (
        <Fragment>
          <EuiCallOut title={message} iconType="cross" color="warning">
            {errorBody}
          </EuiCallOut>

          <EuiSpacer />
        </Fragment>
      );
    }

    return null;
  }

  renderErrors = () => {
    const {
      areErrorsVisible,
      fieldsErrors: { name: errorClusterName, seeds: errorsSeeds, proxyAddress: errorProxyAddress },
    } = this.state;

    const hasErrors = this.hasErrors();

    if (!areErrorsVisible || !hasErrors) {
      return null;
    }

    const errorExplanations = [];

    if (errorClusterName) {
      errorExplanations.push({
        key: 'nameExplanation',
        field: i18n.translate('xpack.remoteClusters.remoteClusterForm.inputNameErrorMessage', {
          defaultMessage: 'The "Name" field is invalid.',
        }),
        error: errorClusterName,
      });
    }

    if (errorsSeeds) {
      errorExplanations.push({
        key: 'seedsExplanation',
        field: i18n.translate('xpack.remoteClusters.remoteClusterForm.inputSeedsErrorMessage', {
          defaultMessage: 'The "Seed nodes" field is invalid.',
        }),
        error: errorsSeeds,
      });
    }

    if (errorProxyAddress) {
      errorExplanations.push({
        key: 'proxyAddressExplanation',
        field: i18n.translate('xpack.remoteClusters.remoteClusterForm.inputProxyErrorMessage', {
          defaultMessage: 'The "Proxy address" field is invalid.',
        }),
        error: errorProxyAddress,
      });
    }

    const messagesToBeRendered = errorExplanations.length && (
      <EuiScreenReaderOnly>
        <dl id={this.generateId(ERROR_LIST_ID)} aria-labelledby={this.generateId(ERROR_TITLE_ID)}>
          {errorExplanations.map(({ key, field, error }) => (
            <div key={key}>
              <dt>{field}</dt>
              <dd>{error}</dd>
            </div>
          ))}
        </dl>
      </EuiScreenReaderOnly>
    );

    return (
      <Fragment>
        <EuiCallOut
          title={
            <span id={this.generateId(ERROR_TITLE_ID)}>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.errorTitle"
                defaultMessage="Some fields require your attention."
              />
            </span>
          }
          color="danger"
          iconType="error"
        />
        <EuiDelayRender>{messagesToBeRendered}</EuiDelayRender>
        <EuiSpacer size="m" data-test-subj="remoteClusterFormGlobalError" />
      </Fragment>
    );
  };

  render() {
    const { isRequestVisible, areErrorsVisible, fields, fieldsErrors } = this.state;
    const { name: errorClusterName } = fieldsErrors;
    const { cluster } = this.props;
    const isNew = !cluster;
    return (
      <Fragment>
        {this.renderSaveErrorFeedback()}
        {this.renderErrors()}

        <EuiForm data-test-subj="remoteClusterForm">
          <EuiDescribedFormGroup
            title={
              <EuiTitle size="s">
                <h2>
                  <FormattedMessage
                    id="xpack.remoteClusters.remoteClusterForm.sectionNameTitle"
                    defaultMessage="Name"
                  />
                </h2>
              </EuiTitle>
            }
            description={
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.sectionNameDescription"
                defaultMessage="A unique name for the cluster."
              />
            }
            fullWidth
          >
            <EuiFormRow
              data-test-subj="remoteClusterFormNameFormRow"
              label={
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.fieldNameLabel"
                  defaultMessage="Name"
                />
              }
              helpText={
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.fieldNameLabelHelpText"
                  defaultMessage="Must contain only letters, numbers, underscores, and dashes."
                />
              }
              error={errorClusterName}
              isInvalid={Boolean(areErrorsVisible && errorClusterName)}
              fullWidth
            >
              <EuiFieldText
                isInvalid={Boolean(areErrorsVisible && errorClusterName)}
                value={fields.name}
                onChange={(e) => this.onFieldsChange({ name: e.target.value })}
                fullWidth
                disabled={!isNew}
                data-test-subj="remoteClusterFormNameInput"
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>

          <ConnectionMode
            fields={fields}
            fieldsErrors={fieldsErrors}
            onFieldsChange={this.onFieldsChange}
            areErrorsVisible={areErrorsVisible}
          />

          {this.renderSkipUnavailable()}
        </EuiForm>

        <EuiSpacer size="l" />

        {this.renderActions()}

        {this.renderSavingFeedback()}

        {isRequestVisible ? (
          <RequestFlyout
            cluster={this.getCluster()}
            close={() => this.setState({ isRequestVisible: false })}
          />
        ) : null}
      </Fragment>
    );
  }
}
