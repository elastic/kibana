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
  EuiFormErrorText,
  EuiFormRow,
  EuiSpacer,
  EuiSelect,
  EuiFieldText,
} from '@elastic/eui';

import routing from '../services/routing';
import { BASE_PATH_REMOTE_CLUSTERS } from '../../../common/constants';

const errorMessages = {
  noClusterFound: () => (
    <FormattedMessage
      id="xpack.crossClusterReplication.forms.emptyRemoteClustersCallOutDescription"
      defaultMessage="You need at least one remote cluster to create a follower index."
    />
  ),
  remoteClusterNotConnectedEditable: (name) => ({
    title: (
      <FormattedMessage
        id="xpack.crossClusterReplication.forms.currentRemoteClusterNotConnectedCallOutTitle"
        defaultMessage="Remote cluster '{name}' is not connected"
        values={{ name }}
      />
    ),
    description: (
      <FormattedMessage
        id="xpack.crossClusterReplication.forms.currentRemoteClusterNotConnectedCallOutDescription"
        defaultMessage="Edit the remote cluster or select a cluster that is connected."
      />
    ),
  }),
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
    };

    renderNotEditable = () => {
      const { areErrorsVisible } = this.props;
      const errorMessage = this.renderErrorMessage();

      return (
        <Fragment>
          <EuiFieldText
            value={this.props.selected}
            fullWidth
            disabled
            isInvalid={areErrorsVisible && Boolean(errorMessage)}
          />
          { areErrorsVisible && Boolean(errorMessage) ? this.renderValidRemoteClusterRequired() : null }
          { errorMessage }
        </Fragment>
      );
    };

    renderValidRemoteClusterRequired = () => (
      <EuiFormErrorText>
        <FormattedMessage
          id="xpack.crossClusterReplication.autoFollowPatternForm.remoteCluster.validRemoteClusterRequired"
          defaultMessage="A connected remote cluster is required."
        />
      </EuiFormErrorText>
    );

    renderDropdown = () => {
      const { remoteClusters, selected, currentUrl, areErrorsVisible } = this.props;
      const hasClusters = Boolean(remoteClusters.length);
      const remoteClustersOptions = hasClusters ? remoteClusters.map(({ name, isConnected }) => ({
        value: name,
        text: isConnected ? name : this.props.intl.formatMessage({
          id: 'xpack.crossClusterReplication.forms.remoteClusterDropdownNotConnected',
          defaultMessage: '{name} (not connected)',
        }, { name }),
        'data-test-subj': `option-${name}`
      })) : [];
      const errorMessage = this.renderErrorMessage();

      return (
        <Fragment>
          <EuiSelect
            fullWidth
            options={remoteClustersOptions}
            value={hasClusters ? selected : ''}
            onChange={(e) => { this.onRemoteClusterChange(e.target.value); }}
            hasNoInitialSelection={!hasClusters}
            isInvalid={areErrorsVisible && Boolean(errorMessage)}
          />
          { areErrorsVisible && Boolean(errorMessage) ? this.renderValidRemoteClusterRequired() : null }
          { errorMessage }

          <Fragment>
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
                  defaultMessage="Add remote cluster"
                />
              </EuiButtonEmpty>
            </div>
          </Fragment>
        </Fragment>
      );
    };

    renderNoClusterFound = () => {
      const { intl, currentUrl } = this.props;
      const title = intl.formatMessage({
        id: 'xpack.crossClusterReplication.forms.emptyRemoteClustersCallOutTitle',
        defaultMessage: `You don't have any remote clusters`,
      });

      return (
        <Fragment>
          <EuiCallOut
            title={title}
            color="danger"
            iconType="cross"
          >
            <p>
              { this.errorMessages.noClusterFound() }
            </p>

            <EuiButton
              {...routing.getRouterLinkProps('/add', BASE_PATH_REMOTE_CLUSTERS, { redirect: currentUrl }, true)}
              iconType="plusInCircle"
              color="danger"
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

    renderCurrentRemoteClusterNotConnected = (name, fatal) => {
      const { isEditable, currentUrl } = this.props;
      const {
        remoteClusterNotConnectedEditable,
        remoteClusterNotConnectedNotEditable,
      } = this.errorMessages;

      const { title, description } = isEditable
        ? remoteClusterNotConnectedEditable(name)
        : remoteClusterNotConnectedNotEditable(name);

      return (
        <EuiCallOut
          title={title}
          color={fatal ? 'danger' : 'warning'}
          iconType="cross"
        >
          <p>
            { description }
          </p>

          <EuiButton
            {...routing.getRouterLinkProps(`/edit/${name}`, BASE_PATH_REMOTE_CLUSTERS, { redirect: currentUrl }, true)}
            color={fatal ? 'danger' : 'warning'}
          >
            <FormattedMessage
              id="xpack.crossClusterReplication.forms.viewRemoteClusterButtonLabel"
              defaultMessage="Edit remote cluster"
            />
          </EuiButton>
        </EuiCallOut>
      );
    };

    renderRemoteClusterDoesNotExist = (name) => {
      const { intl, currentUrl } = this.props;
      const title = intl.formatMessage({
        id: 'xpack.crossClusterReplication.forms.remoteClusterNotFoundTitle',
        defaultMessage: `Couldn't find remote cluster '{name}'`,
      }, { name });

      return (
        <EuiCallOut
          title={title}
          color="danger"
          iconType="cross"
        >
          <p>
            { this.errorMessages.remoteClusterDoesNotExist(name) }
          </p>
          <EuiButton
            {...routing.getRouterLinkProps('/add', BASE_PATH_REMOTE_CLUSTERS, { redirect: currentUrl }, true)}
            iconType="plusInCircle"
            color="danger"
          >
            <FormattedMessage
              id="xpack.crossClusterReplication.forms.addRemoteClusterButtonLabel"
              defaultMessage="Add remote cluster"
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
          error = this.renderCurrentRemoteClusterNotConnected(selected, true);
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

      if(isEditable) {
        if(hasClusters) {
          field = this.renderDropdown();
        } else {
          field = this.renderErrorMessage();
        }
      } else {
        field = this.renderNotEditable();
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
          <Fragment>
            {field}
          </Fragment>
        </EuiFormRow>
      );
    }
  }
);
