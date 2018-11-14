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
  EuiBreadcrumbs,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { CRUD_APP_BASE_PATH } from '../../constants';
import { getRouterLinkProps } from '../../services';

import { RemoteClusterForm } from './remote_cluster_form';

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

  getFieldsErrors(fields) {
    const { remoteClusterName, seeds } = fields;

    const errors = {};

    if (!remoteClusterName || !remoteClusterName.trim()) {
      errors.remoteClusterName = (
        <FormattedMessage
          id="xpack.remoteClusters.add.errors.nameMissing"
          defaultMessage="Name is required."
        />
      );
    }

    if (!seeds.some(seed => Boolean(seed.trim()))) {
      errors.seeds = (
        <FormattedMessage
          id="xpack.remoteClusters.add.errors.seedMissing"
          defaultMessage="At least one seed is required."
        />
      );
    }

    return errors;
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
    const { fieldsErrors } = this.state;

    if (Object.keys(fieldsErrors).length > 0) {
      this.setState({
        areErrorsVisible: true,
      });
      return;
    }

    const remoteClusterConfig = this.getAllFields();

    addRemoteCluster(remoteClusterConfig);
  };

  render() {
    const { isAddingRemoteCluster, addRemoteClusterError } = this.props;
    const { fields, fieldsErrors, areErrorsVisible } = this.state;

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

              <RemoteClusterForm
                isSaving={isAddingRemoteCluster}
                fields={fields}
                fieldsErrors={fieldsErrors}
                onFieldsChange={this.onFieldsChange}
                areErrorsVisible={areErrorsVisible}
                saveError={addRemoteClusterError}
                save={this.save}
              />
            </EuiPageContent>
          </EuiPageBody>
        </EuiPage>
      </Fragment>
    );
  }
}

export const RemoteClusterAdd = injectI18n(RemoteClusterAddUi);
