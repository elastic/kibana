/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import cloneDeep from 'lodash/lang/cloneDeep';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBreadcrumbs,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiText,
  EuiLoadingKibana,
  EuiOverlayMask,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { CRUD_APP_BASE_PATH } from '../../constants';
import { getRouterLinkProps } from '../../services';

const defaultFields = {
  remoteClusterName: '',
  seeds: [],
};

export class RemoteClusterAddUi extends Component {
  static propTypes = {
    addRemoteCluster: PropTypes.func,
    isAddingRemoteCluster: PropTypes.bool,
    addRemoteClusterError: PropTypes.node,
    clearAddRemoteClusterErrors: PropTypes.func,
  }

  constructor(props) {
    super(props);

    const fields = cloneDeep(defaultFields);

    this.state = {
      fieldsErrors: this.getFieldsErrors(fields),
      areErrorsVisible: false,
      fields,
    };
  }

  componentWillUnmount() {
    // Clean up after ourselves.
    this.props.clearAddRemoteClusterErrors();
  }

  getFieldsErrors(/*fields*/) {
    return {};
  }

  onFieldsChange = (changedFields) => {
    const { fields: prevFields } = this.state;

    const newFields = {
      ...prevFields,
      ...changedFields,
    };

    this.setState({
      fields: newFields,
      fieldsErrors: this.getFieldsErrors(newFields),
    });
  };

  getAllFields() {
    const {
      fields: {
        remoteClusterName,
        seeds,
      },
    } = this.state;

    return {
      remoteClusterName,
      seeds,
    };
  }

  save = () => {
    const { addRemoteCluster } = this.props;
    const remoteClusterConfig = this.getAllFields();

    addRemoteCluster(remoteClusterConfig);
  };

  renderActions() {
    const { isSaving } = this.props;

    if (isSaving) {
      return (
        <EuiFlexGroup justifyContent="flexStart" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l"/>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiText>
              <FormattedMessage
                id="xpack.remoteClusters.add.actions.savingText"
                defaultMessage="Saving"
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return (
      <EuiButton
        color="secondary"
        iconType="check"
        onClick={this.save}
        fill
      >
        <FormattedMessage
          id="xpack.remoteClusters.add.saveButtonLabel"
          defaultMessage="Save"
        />
      </EuiButton>
    );
  }

  render() {
    const { isAddingRemoteCluster, addRemoteClusterError } = this.props;

    const breadcrumbs = [{
      text: (
        <FormattedMessage
          id="xpack.remoteClusters.add.breadcrumbs.listText"
          defaultMessage="Remote clusters"
        />
      ),
      ...getRouterLinkProps(CRUD_APP_BASE_PATH),
    }, {
      text: (
        <FormattedMessage
          id="xpack.remoteClusters.add.breadcrumbs.addText"
          defaultMessage="Connect"
        />
      ),
    }];

    let savingFeedback;

    if (isAddingRemoteCluster) {
      savingFeedback = (
        <EuiOverlayMask>
          <EuiLoadingKibana size="xl"/>
        </EuiOverlayMask>
      );
    }

    let saveErrorFeedback;

    if (addRemoteClusterError) {
      const { message, cause } = addRemoteClusterError;

      let errorBody;

      if (cause) {
        if (cause.length === 1) {
          errorBody = (
            <p>{cause[0]}</p>
          );
        } else {
          errorBody = (
            <ul>
              {cause.map(causeValue => <li key={causeValue}>{causeValue}</li>)}
            </ul>
          );
        }
      }

      saveErrorFeedback = (
        <Fragment>
          <EuiCallOut
            title={message}
            icon="cross"
            color="danger"
          >
            {errorBody}
          </EuiCallOut>

          <EuiSpacer />
        </Fragment>
      );
    }

    return (
      <Fragment>
        <EuiPage>
          <EuiPageBody>
            <EuiPageContent
              horizontalPosition="center"
              className="remoteClusterAddPage"
            >
              <EuiBreadcrumbs breadcrumbs={breadcrumbs} responsive={false} />
              <EuiSpacer size="xs" />

              <EuiPageContentHeader>
                <EuiTitle size="l">
                  <h1>
                    <FormattedMessage
                      id="xpack.remoteClusters.addTitle"
                      defaultMessage="Connect remote cluster"
                    />
                  </h1>
                </EuiTitle>
              </EuiPageContentHeader>

              {saveErrorFeedback}

              Form stuff goes here

              <EuiSpacer size="l" />

              {this.renderActions()}
            </EuiPageContent>
          </EuiPageBody>
        </EuiPage>

        {savingFeedback}
      </Fragment>
    );
  }
}

export const RemoteClusterAdd = injectI18n(RemoteClusterAddUi);
