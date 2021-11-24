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
  EuiLoadingSpinner,
  EuiOverlayMask,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiDelayRender,
  EuiScreenReaderOnly,
  htmlIdGenerator,
  EuiSwitchEvent,
} from '@elastic/eui';

import { Cluster } from '../../../../../common/lib';
import { SNIFF_MODE, PROXY_MODE } from '../../../../../common/constants';

import { AppContext, Context } from '../../../app_context';

import { skippingDisconnectedClustersUrl } from '../../../services/documentation';

import { RequestFlyout } from './request_flyout';
import { ConnectionMode } from './components';
import {
  ClusterErrors,
  convertCloudUrlToProxyConnection,
  convertProxyConnectionToCloudUrl,
  validateCluster,
  isCloudUrlEnabled,
} from './validators';

const defaultClusterValues: Cluster = {
  name: '',
  seeds: [],
  skipUnavailable: false,
  nodeConnections: 3,
  proxyAddress: '',
  proxySocketConnections: 18,
  serverName: '',
};

const ERROR_TITLE_ID = 'removeClustersErrorTitle';
const ERROR_LIST_ID = 'removeClustersErrorList';

interface Props {
  save: (cluster: Cluster) => void;
  cancel?: () => void;
  isSaving?: boolean;
  saveError?: any;
  cluster?: Cluster;
}

export type FormFields = Cluster & { cloudUrl: string; cloudUrlEnabled: boolean };

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
        cloudUrl: convertProxyConnectionToCloudUrl(cluster),
        cloudUrlEnabled: isCloudEnabled && isCloudUrlEnabled(cluster),
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

    // when cloudUrl changes, fill proxy address and server name
    const { cloudUrl } = changedFields;
    if (cloudUrl) {
      const { proxyAddress, serverName } = convertCloudUrlToProxyConnection(cloudUrl);
      changedFields = {
        ...changedFields,
        proxyAddress,
        serverName,
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

  getCluster(): Cluster {
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

  resetToDefault = (fieldName: keyof Cluster) => {
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
          hasEmptyLabelSpace
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
    const { isSaving, cancel } = this.props;
    const { areErrorsVisible, isRequestVisible } = this.state;

    if (isSaving) {
      return (
        <EuiFlexGroup justifyContent="flexStart" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiText>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.actions.savingText"
                defaultMessage="Saving"
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    let cancelButton;

    if (cancel) {
      cancelButton = (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty color="primary" onClick={cancel}>
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      );
    }

    const isSaveDisabled = areErrorsVisible && this.hasErrors();

    return (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="remoteClusterFormSaveButton"
                color="success"
                iconType="check"
                onClick={this.save}
                fill
                isDisabled={isSaveDisabled}
                aria-describedby={`${this.generateId(ERROR_TITLE_ID)} ${this.generateId(
                  ERROR_LIST_ID
                )}`}
              >
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.saveButtonLabel"
                  defaultMessage="Save"
                />
              </EuiButton>
            </EuiFlexItem>

            {cancelButton}
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={this.toggleRequest} data-test-subj="remoteClustersRequestButton">
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
      fieldsErrors: {
        name: errorClusterName,
        seeds: errorsSeeds,
        proxyAddress: errorProxyAddress,
        serverName: errorServerName,
        cloudUrl: errorCloudUrl,
      },
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

    if (errorServerName) {
      errorExplanations.push({
        key: 'serverNameExplanation',
        field: i18n.translate(
          'xpack.remoteClusters.remoteClusterForm.inputServerNameErrorMessage',
          {
            defaultMessage: 'The "Server name" field is invalid.',
          }
        ),
        error: errorServerName,
      });
    }

    if (errorCloudUrl) {
      errorExplanations.push({
        key: 'cloudUrlExplanation',
        field: i18n.translate('xpack.remoteClusters.remoteClusterForm.inputcloudUrlErrorMessage', {
          defaultMessage: 'The "Elasticsearch endpoint URL" field is invalid.',
        }),
        error: errorCloudUrl,
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
        <EuiSpacer size="m" data-test-subj="remoteClusterFormGlobalError" />
        <EuiCallOut
          title={
            <h3 id={this.generateId(ERROR_TITLE_ID)}>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.errorTitle"
                defaultMessage="Fix errors before continuing."
              />
            </h3>
          }
          color="danger"
          iconType="cross"
        />
        <EuiDelayRender>{messagesToBeRendered}</EuiDelayRender>
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

        {this.renderErrors()}

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
