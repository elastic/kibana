/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import pluralize from 'pluralize';

import {
  EuiCallOut,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiPage,
  EuiPageContent,
} from '@elastic/eui';

import { InfoAlerts } from './info_alerts';
import { PipelinesTable } from './pipelines_table';
import { ConfirmDeleteModal } from './confirm_delete_modal';

export class PipelineList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      columns: [],
      isForbidden: false,
      isLoading: true,
      isSelectable: false,
      pipelines: [],
      showAddRoleAlert: false,
      showConfirmDeleteModal: false,
      showEnableMonitoringAlert: false,
      selection: [],
    };
  }

  componentDidMount = () => {
    const { isReadOnly, licenseService, toastNotifications } = this.props;

    this.loadPipelines().then(() => {
      if (isReadOnly) {
        toastNotifications.addWarning(licenseService.message);
      }
    });

    this.checkMonitoringAccess();
  };

  getEmptyPrompt = () => (
    <EuiEmptyPrompt
      title={<h2>No pipelines</h2>}
      titleSize="xs"
      body="There are no pipelines defined."
    />
  );

  getErrorPrompt = () => (
    <EuiEmptyPrompt
      title={<h2>Error</h2>}
      titleSize="xs"
      body="Error encountered while loading pipelines."
    />
  );

  loadPipelines = () => {
    const { isReadOnly, licenseService, pipelinesService, toastNotifications } = this.props;

    this.setState({
      message: (
        <div>
          <EuiLoadingSpinner size="m" />
          &nbsp; Loading pipelines....
        </div>
      ),
    });

    return pipelinesService
      .getPipelineList()
      .then(pipelines => {
        this.setState({
          isLoading: false,
          isForbidden: false,
          isSelectable: true,
          pipelines,
        });

        if (!pipelines.length) {
          this.setState({
            columns: [],
            message: this.getEmptyPrompt(),
            isSelectable: false,
          });
        }
      })
      .catch(err => {
        this.setState({
          isLoading: false,
          message: this.getErrorPrompt(),
        });
        return licenseService.checkValidity().then(() => {
          if (err.status === 403) {
            this.setState({ isLoading: false });

            if (isReadOnly) {
              this.setState({ isForbidden: false });
            } else {
              this.setState({ isForbidden: true });
            }
          } else {
            this.setState({ isForbidden: false });
            toastNotifications.addDanger(`Couldn't load pipeline. Error: "${err.statusText}".`);
          }
        });
      });
  };

  checkMonitoringAccess = () => {
    const { clusterService, monitoringService } = this.props;

    clusterService.isClusterInfoAvailable().then(isAvailable => {
      this.setState({
        showAddRoleAlert: !isAvailable,
        showEnableMonitoringAlert: !monitoringService.isMonitoringEnabled(),
      });
    });
  };

  renderNoPermissionCallOut = () => {
    const { isForbidden, isLoading } = this.state;
    return isForbidden && !isLoading ? (
      <EuiCallOut
        color="danger"
        iconType="cross"
        title="You do not have permission to manage Logstash pipelines."
      >
        <p>Please contact your administrator.</p>
      </EuiCallOut>
    ) : null;
  };

  hideDeletePipelinesModal = () => {
    this.setState({
      showConfirmDeleteModal: false,
    });
  };

  showDeletePipelinesModal = () => {
    this.setState({
      showConfirmDeleteModal: true,
    });
  };

  cancelDeletePipelines = () => {
    this.hideDeletePipelinesModal();
  };

  deleteSelectedPipelines = () => {
    this.hideDeletePipelinesModal();
    const { licenseService, pipelinesService, toastNotifications } = this.props;
    const { selection } = this.state;
    const numPipelinesSelected = selection.length;
    const totalPluralized = pluralize('Pipeline', numPipelinesSelected);

    const pipelineIds = selection.map(({ id }) => id);
    return pipelinesService
      .deletePipelines(pipelineIds)
      .then(results => {
        const { numSuccesses, numErrors } = results;
        const errorPluralized = pluralize('Pipeline', numErrors);

        if (numSuccesses === 1 && numErrors === 0) {
          toastNotifications.addSuccess(`Deleted "${selection[0].id}"`);
        } else if (numSuccesses) {
          let text;
          if (numErrors) {
            text = `But ${numErrors} ${errorPluralized} couldn't be deleted.`;
          }

          toastNotifications.addSuccess({
            title: `Deleted ${numSuccesses} out of ${numPipelinesSelected} ${totalPluralized}`,
            text,
          });
        } else if (numErrors) {
          toastNotifications.addError(`Failed to delete ${numErrors} ${errorPluralized}`);
        }

        this.loadPipelines();
      })
      .catch(err => {
        return licenseService.checkValidity().then(() => toastNotifications.addDanger(err));
      });
  };

  onDeleteSelectedPipelines = () => {
    this.showDeletePipelinesModal();
  };

  onSelectionChange = selection => this.setState({ selection });

  render() {
    const { clonePipeline, createPipeline, isReadOnly, openPipeline } = this.props;
    const { isSelectable, message, pipelines, selection, showConfirmDeleteModal } = this.state;
    return (
      <EuiPage data-test-subj="pipelineList">
        <EuiPageContent horizontalPosition="center">
          {this.renderNoPermissionCallOut()}
          <PipelinesTable
            clonePipeline={clonePipeline}
            createPipeline={createPipeline}
            isReadOnly={isReadOnly}
            isSelectable={isSelectable}
            message={message}
            pipelines={pipelines}
            selection={selection}
            onDeleteSelectedPipelines={this.onDeleteSelectedPipelines}
            onSelectionChange={this.onSelectionChange}
            openPipeline={openPipeline}
          />
        </EuiPageContent>
        <ConfirmDeleteModal
          cancelDeletePipelines={this.cancelDeletePipelines}
          deleteSelectedPipelines={this.deleteSelectedPipelines}
          selection={selection}
          showConfirmDeleteModal={showConfirmDeleteModal}
        />
        <InfoAlerts
          showAddRoleAlert={this.state.showAddRoleAlert}
          showEnableMonitoringAlert={this.state.showEnableMonitoringAlert}
        />
      </EuiPage>
    );
  }
}
