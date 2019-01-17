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
    defaultMessage="Edit the remote cluster to fix the problem or select a different one."
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
        : { error: { message: (
          <FormattedMessage
            id="xpack.crossClusterReplication.forms.invalidRemoteClusterError"
            defaultMessage="Invalid remote cluster"
          />
        ) } };
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
        inputDisplay: isConnected ? name : (
          <FormattedMessage
            id="xpack.crossClusterReplication.forms.remoteClusterDropdownNotConnected"
            defaultMessage="{name} (not connected)"
            values={{ name }}
          />
        ),
        'data-test-subj': `option-${name}`
      }));

      return (
        <Fragment>
          <EuiSuperSelect
            fullWidth
            options={remoteClustersOptions}
            valueOfSelected={selected}
            onChange={this.onRemoteClusterChange}
          />
          { this.renderErrorMessage() }
          <EuiSpacer size="s" />
          <div> {/* Break out of EuiFormRow's flexbox layout */}
            <EuiButtonEmpty
              {...routing.getRouterLinkProps('/add', BASE_PATH_REMOTE_CLUSTERS, { redirect: currentUrl }, true)}
              size="s"
              iconType="plusInCircle"
              flush="left"
            >
              <FormattedMessage
                id="xpack.crossClusterReplication.forms.addRemoteClusterButtonLabel"
                defaultMessage="Add new remote cluster"
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
              {...routing.getRouterLinkProps('/add', BASE_PATH_REMOTE_CLUSTERS, { redirect: currentUrl }, true)}
              iconType="plusInCircle"
              color="warning"
            >
              <FormattedMessage
                id="xpack.crossClusterReplication.forms.addRemoteClusterButtonLabel"
                defaultMessage="Add new remote cluster"
              />
            </EuiButton>
          </EuiCallOut>
        </Fragment>
      );
    };

    renderCurrentRemoteClusterNotConnected = (name) => {
      const { intl, isEditable, currentUrl } = this.props;
      const title = intl.formatMessage({
        id: 'xpack.crossClusterReplication.forms.remoteClusterConnectionErrorTitle',
        defaultMessage: `The remote cluster '{name}' is not connected`
      }, { name });

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
            {...routing.getRouterLinkProps(`/edit/${name}`, BASE_PATH_REMOTE_CLUSTERS, { redirect: currentUrl }, true)}
            color="warning"
          >
            <FormattedMessage
              id="xpack.crossClusterReplication.forms.viewRemoteClusterButtonLabel"
              defaultMessage="Edit remote cluster '{name}'"
              values={{ name }}
            />
          </EuiButton>
        </EuiCallOut>
      );
    };

    renderRemoteClusterDoesNotExist = (name) => {
      const { intl, currentUrl } = this.props;
      const title = intl.formatMessage({
        id: 'xpack.crossClusterReplication.forms.remoteClusterNotFoundTitle',
        defaultMessage: `The remote cluster '{name}' was not found`,
      }, { name });

      return (
        <EuiCallOut
          title={title}
          color="warning"
          iconType="cross"
        >
          <p>
            { this.errorMessages.remoteClusterDoesNotExist() }
          </p>
          <EuiButton
            {...routing.getRouterLinkProps('/add', BASE_PATH_REMOTE_CLUSTERS, { redirect: currentUrl }, true)}
            iconType="plusInCircle"
            color="warning"
          >
            <FormattedMessage
              id="xpack.crossClusterReplication.forms.addRemoteClusterButtonLabel"
              defaultMessage="Add new remote cluster"
            />
          </EuiButton>
        </EuiCallOut>
      );
    }

    renderErrorMessage = () => {
      const { selected, remoteClusters, isEditable } = this.props;
      const remoteCluster = remoteClusters.find(c => c.name === selected);
      const isSelectedRemoteClusterConnected = remoteCluster && remoteCluster.isConnected;
      let error;

      if (isEditable) {
        /* Create */
        const hasClusters = Boolean(remoteClusters.length);
        if (hasClusters && !isSelectedRemoteClusterConnected) {
          error = this.renderCurrentRemoteClusterNotConnected(selected);
        } else if (!hasClusters) {
          error = this.renderNoClusterFound();
        }
      } else {
        /* Edit */
        const doesExists = !!remoteCluster;
        if (!doesExists) {
          error = this.renderRemoteClusterDoesNotExist(selected);
        } else if (!isSelectedRemoteClusterConnected) {
          error = this.renderCurrentRemoteClusterNotConnected(selected);
        }
      }

      return error ? (
        <Fragment>
          <EuiSpacer size="s" />
          {error}
        </Fragment>
      ) : null;
    }

    render() {
      const { remoteClusters, selected, isEditable, areErrorsVisible } = this.props;
      const remoteCluster = remoteClusters.find(c => c.name === selected);
      const hasClusters = Boolean(remoteClusters.length);
      const isSelectedRemoteClusterConnected = remoteCluster && remoteCluster.isConnected;
      const isInvalid = areErrorsVisible && (!hasClusters || !isSelectedRemoteClusterConnected);
      let field;

      if(!isEditable) {
        field = (
          <Fragment>
            { this.renderNotEditable() }
            { this.renderErrorMessage() }
          </Fragment>
        );
      } else {
        if(hasClusters) {
          field = (
            <Fragment>
              { this.renderDropdown() }
            </Fragment>
          );
        } else {
          field = (
            <Fragment>
              { this.renderErrorMessage() }
            </Fragment>
          );
        }
      }

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
          {field}
        </EuiFormRow>
      );
    }
  }
);
