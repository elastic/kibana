/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { injectI18n, FormattedMessage } from '@kbn/i18n-react';

import {
  EuiCallOut,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiPageContentBody_Deprecated as EuiPageContentBody,
  EuiPageHeader,
  EuiSpacer,
} from '@elastic/eui';

import { InfoAlerts } from './info_alerts';
import { PipelinesTable } from './pipelines_table';
import { ConfirmDeleteModal } from './confirm_delete_modal';

class PipelineListUi extends React.Component {
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
      searchTerm: '',
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
      title={
        <h2>
          <FormattedMessage
            id="xpack.logstash.pipelineList.noPipelinesTitle"
            defaultMessage="No pipelines found"
          />
        </h2>
      }
      titleSize="xs"
      body={
        <FormattedMessage
          id="xpack.logstash.pipelineList.noPipelinesDescription"
          defaultMessage="There are no pipelines defined."
        />
      }
    />
  );

  getErrorPrompt = () => (
    <EuiEmptyPrompt
      title={
        <h2>
          <FormattedMessage
            id="xpack.logstash.pipelineList.pipelinesLoadingErrorTitle"
            defaultMessage="Error"
          />
        </h2>
      }
      titleSize="xs"
      body={
        <FormattedMessage
          id="xpack.logstash.pipelineList.pipelinesLoadingErrorDescription"
          defaultMessage="Error encountered while loading pipelines."
        />
      }
    />
  );

  getFilteredPipelines = (pipelines, searchTerm) => {
    if (!searchTerm.trim()) {
      return pipelines;
    }

    const searchTerms = searchTerm.split(' ').filter((term) => term !== '');
    const filteredPipelines = pipelines.filter((pipeline) => {
      return searchTerms.every((term) => {
        if (term.startsWith('id:')) {
          const idTerm = term.slice(3);
          return pipeline.id.toLowerCase().includes(idTerm.toLowerCase());
        } else {
          return Object.values(pipeline).some((value) => {
            if (typeof value === 'string') {
              return value.toLowerCase().includes(term.toLowerCase());
            }
            return false;
          });
        }
      });
    });

    return filteredPipelines;
  };

  loadPipelines = () => {
    const { isReadOnly, licenseService, pipelinesService, toastNotifications, intl } = this.props;

    this.setState({
      message: (
        <div data-test-subj="loadingPipelines">
          <EuiLoadingSpinner size="m" />
          &nbsp;{' '}
          <FormattedMessage
            id="xpack.logstash.pipelineList.pipelinesLoadingMessage"
            defaultMessage="Loading pipelines…"
          />
        </div>
      ),
    });

    return pipelinesService
      .getPipelineList()
      .then((pipelines) => {
        const { searchTerm } = this.state;
        const filteredPipelines = this.getFilteredPipelines(pipelines, searchTerm);

        this.setState({
          isLoading: false,
          isForbidden: false,
          isSelectable: true,
          pipelines: filteredPipelines,
        });

        if (!filteredPipelines.length) {
          this.setState({
            columns: [],
            message: this.getEmptyPrompt(),
            isSelectable: false,
          });
        }
      })
      .catch((err) => {
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
            toastNotifications.addDanger(
              intl.formatMessage(
                {
                  id: 'xpack.logstash.pipelineList.pipelineLoadingErrorNotification',
                  defaultMessage: `Couldn't load pipeline. Error: "{errStatusText}".`,
                },
                {
                  errStatusText: err.statusText,
                }
              )
            );
          }
        });
      });
  };

  checkMonitoringAccess = () => {
    const { clusterService, monitoringService } = this.props;

    clusterService.isClusterInfoAvailable().then((isAvailable) => {
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
        title={
          <FormattedMessage
            id="xpack.logstash.pipelineList.noPermissionToManageTitle"
            defaultMessage="You do not have permission to manage Logstash pipelines."
          />
        }
      >
        <p>
          <FormattedMessage
            id="xpack.logstash.pipelineList.noPermissionToManageDescription"
            defaultMessage="Please contact your administrator."
          />
        </p>
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
    const { licenseService, pipelinesService, toastNotifications, intl } = this.props;
    const { selection } = this.state;
    const numPipelinesSelected = selection.length;

    const pipelineIds = selection.map(({ id }) => id);
    return pipelinesService
      .deletePipelines(pipelineIds)
      .then((results) => {
        const { numSuccesses, numErrors } = results;

        if (numSuccesses === 1 && numErrors === 0) {
          toastNotifications.addSuccess(
            intl.formatMessage(
              {
                id: 'xpack.logstash.pipelineList.pipelinesSuccessfullyDeletedNotification',
                defaultMessage: 'Deleted "{id}"',
              },
              {
                id: selection[0].id,
              }
            )
          );
        } else if (numSuccesses) {
          let text;
          if (numErrors) {
            text = intl.formatMessage(
              {
                id: 'xpack.logstash.pipelineList.pipelinesCouldNotBeDeletedDescription',
                defaultMessage: `But {numErrors, plural, one {# Pipeline} other {# Pipelines}} couldn't be deleted.`,
              },
              {
                numErrors,
              }
            );
          }

          toastNotifications.addSuccess({
            title: intl.formatMessage(
              {
                id: 'xpack.logstash.pipelineList.successfullyDeletedPipelinesNotification',
                defaultMessage:
                  'Deleted {numSuccesses} out of {numPipelinesSelected, plural, one {# Pipeline} other {# Pipelines}}',
              },
              {
                numSuccesses,
                numPipelinesSelected,
                numPipelinesSelected,
              }
            ),
            text,
          });
        } else if (numErrors) {
          toastNotifications.addError(
            intl.formatMessage(
              {
                id: 'xpack.logstash.pipelineList.couldNotDeletePipelinesNotification',
                defaultMessage:
                  'Failed to delete {numErrors, plural, one {# Pipeline} other {# Pipelines}}',
              },
              {
                numErrors,
              }
            )
          );
        }

        this.loadPipelines();
      })
      .catch((err) => {
        return licenseService.checkValidity().then(() => toastNotifications.addDanger(err));
      });
  };

  onDeleteSelectedPipelines = () => {
    this.showDeletePipelinesModal();
  };

  onSelectionChange = (selection) => this.setState({ selection });

  onSearchChange = (searchTerm) => {
    this.setState({ searchTerm }, () => {
      this.loadPipelines();
    });
  };

  render() {
    const { clonePipeline, createPipeline, isReadOnly, openPipeline } = this.props;
    const { isSelectable, message, pipelines, selection, showConfirmDeleteModal } = this.state;
    return (
      <EuiPageContentBody data-test-subj="pipelineList">
        <EuiPageHeader
          pageTitle={
            <FormattedMessage id="xpack.logstash.pipelineList.head" defaultMessage="Pipelines" />
          }
          description={
            <FormattedMessage
              id="xpack.logstash.pipelineList.subhead"
              defaultMessage="Manage logstash event processing and see the result visually"
            />
          }
          bottomBorder
        />
        <EuiSpacer size="l" />
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
          onSearchChange={this.onSearchChange}
        />

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
      </EuiPageContentBody>
    );
  }
}

export const PipelineList = injectI18n(PipelineListUi);
