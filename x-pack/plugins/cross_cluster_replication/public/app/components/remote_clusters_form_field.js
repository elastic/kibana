/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, { Fragment, PureComponent } from 'react';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFormRow,
  EuiSpacer,
  EuiSuperSelect,
  EuiFieldText,
} from '@elastic/eui';

import routing from '../services/routing';
import { BASE_PATH_REMOTE_CLUSTERS } from '../../../common/constants';

const errorMessages = {
  noClusterFound: () => (<FormattedMessage
    id="xpack.crossClusterReplication.forms.emptyRemoteClustersCallOutDescription"
    defaultMessage="No cluster found. You must add a remote cluster."
  />),
  remoteClusterNotConnectedEditable: (name) => (<FormattedMessage
    id="xpack.crossClusterReplication.forms.currentRemoteClusterNotConnectedCallOutDescription"
    defaultMessage="The remote cluster '{name}' is not connected. Select another remote cluster or add a new one."
    values={{ name }}
  />),
};

export const RemoteClustersFormField = injectI18n(
  class extends PureComponent {
    errorMessages = {
      ...errorMessages,
      ...this.props.errorMessages
    }

    componentDidMount() {
      const { selected, onError } = this.props;
      const { error } = this.validateRemoteCluster(selected);

      onError(error);
    }

    validateRemoteCluster(clusterName) {
      const { remoteClusters } = this.props;
      const remoteCluster = remoteClusters.find(c => c.name === clusterName);

      return remoteCluster && remoteCluster.isConnected
        ? { error: null }
        : { error: { message: 'Invalid remote cluster' } };
    }

    onRemoteClusterChange = (cluster) => {
      const { onChange, onError } = this.props;
      const { error } = this.validateRemoteCluster(cluster);
      onChange(cluster);
      onError(error);
    }

    renderNotEditable = () => (
      <EuiFieldText
        value={this.props.selected}
        fullWidth
        disabled={true}
      />
    );

    renderDropdown = () => {
      const { remoteClusters, selected, currentUrl } = this.props;
      const remoteClustersOptions = remoteClusters.map(({ name, isConnected }) => ({
        value: name,
        inputDisplay: isConnected ? name : `${name} (not connected)`,
        disabled: !isConnected,
        'data-test-subj': `option-${name}`
      }));

      return (
        <Fragment>
          <EuiSuperSelect
            options={remoteClustersOptions}
            valueOfSelected={selected}
            onChange={this.onRemoteClusterChange}
          />
          <EuiSpacer size="s" />
          <div>
            <EuiButtonEmpty
              {...routing.getRouterLinkProps('/add', BASE_PATH_REMOTE_CLUSTERS, { redirect: currentUrl })}
              size="s"
            >
              <FormattedMessage
                id="xpack.crossClusterReplication.forms.addRemoteClusterButtonLabel"
                defaultMessage="Add remote cluster"
              />
            </EuiButtonEmpty>
          </div>
        </Fragment>
      );
    };

    renderNoClusterFound = () => {
      const { intl, currentUrl } = this.props;
      const title = intl.formatMessage({
        id: 'xpack.crossClusterReplication.forms.emptyRemoteClustersCallOutTitle',
        defaultMessage: 'No remote cluster found'
      });

      return (
        <Fragment>
          <EuiCallOut
            title={title}
            color="warning"
            iconType="cross"
          >
            <p>
              { this.errorMessages.noClusterFound() }
            </p>

            <EuiButton
              {...routing.getRouterLinkProps('/add', BASE_PATH_REMOTE_CLUSTERS, { redirect: currentUrl })}
              iconType="plusInCircle"
              color="warning"
            >
              <FormattedMessage
                id="xpack.crossClusterReplication.forms.addRemoteClusterButtonLabel"
                defaultMessage="Add remote cluster"
              />
            </EuiButton>
          </EuiCallOut>
        </Fragment>
      );
    };

    renderCurrentRemoteClusterNotConnected = (name) => {
      const { intl, isEditable } = this.props;
      const title = intl.formatMessage({
        id: 'xpack.crossClusterReplication.forms.remoteClusterConnectionErrorTitle',
        defaultMessage: 'Remote cluster connection error'
      });

      return (
        <EuiCallOut
          title={title}
          color="warning"
          iconType="cross"
        >
          <p>
            { isEditable && this.errorMessages.remoteClusterNotConnectedEditable(name)}
            { !isEditable && this.errorMessages.remoteClusterNotConnectedNotEditable(name)}
          </p>
          <EuiButton
            {...routing.getRouterLinkProps('/', BASE_PATH_REMOTE_CLUSTERS)}
            color="warning"
          >
            <FormattedMessage
              id="xpack.crossClusterReplication.forms.viewRemoteClusterButtonLabel"
              defaultMessage="View remote clusters"
            />
          </EuiButton>
        </EuiCallOut>
      );
    };

    renderRemoteClusterDoesNotExist = (name) => {
      const { intl } = this.props;
      const title = intl.formatMessage({
        id: 'xpack.crossClusterReplication.forms.remoteClusterErrorTitle',
        defaultMessage: 'Remote cluster error'
      });

      return (
        <EuiCallOut
          title={title}
          color="warning"
          iconType="cross"
        >
          <p>
            { this.errorMessages.remoteClusterDoesNotExist(name) }
          </p>
          <EuiButton
            {...routing.getRouterLinkProps('/', BASE_PATH_REMOTE_CLUSTERS)}
            color="warning"
          >
            <FormattedMessage
              id="xpack.crossClusterReplication.forms.viewRemoteClusterButtonLabel"
              defaultMessage="View remote clusters"
            />
          </EuiButton>
        </EuiCallOut>
      );
    }

    renderErrorMessage = () => {
      const { selected, remoteClusters, isEditable } = this.props;
      const remoteCluster = remoteClusters.find(c => c.name === selected);
      const hasClusters = Boolean(remoteClusters.length);
      const isSelectedRemoteClusterConnected = remoteCluster && remoteCluster.isConnected;

      if (isEditable) {
        /* Create */
        if (hasClusters && !isSelectedRemoteClusterConnected) {
          return this.renderCurrentRemoteClusterNotConnected(selected);
        } else if (!hasClusters) {
          return this.renderNoClusterFound();
        }
      } else {
        /* Edit */
        const doesExists = !!remoteCluster;
        if (!doesExists) {
          return this.renderRemoteClusterDoesNotExist(selected);
        } else if (!isSelectedRemoteClusterConnected) {
          return this.renderCurrentRemoteClusterNotConnected(selected);
        }
      }

      return null;
    }

    render() {
      const { remoteClusters, selected, isEditable, areErrorsVisible } = this.props;
      const remoteCluster = remoteClusters.find(c => c.name === selected);
      const hasClusters = Boolean(remoteClusters.length);
      const isSelectedRemoteClusterConnected = remoteCluster && remoteCluster.isConnected;
      const isInvalid = areErrorsVisible && (!hasClusters || !isSelectedRemoteClusterConnected);

      return (
        <EuiFormRow
          label={(
            <FormattedMessage
              id="xpack.crossClusterReplication.autoFollowPatternForm.remoteCluster.fieldClusterLabel"
              defaultMessage="Remote cluster"
            />
          )}
          isInvalid={isInvalid}
          fullWidth
        >
          <Fragment>
            { !isEditable && this.renderNotEditable() }
            { isEditable && hasClusters && this.renderDropdown() }
            <EuiSpacer size="s" />
            { this.renderErrorMessage() }
          </Fragment>
        </EuiFormRow>
      );
    }
  }
);
