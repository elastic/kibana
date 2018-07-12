/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { isEmpty } from 'lodash';
import pluralize from 'pluralize';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiConfirmModal,
  EuiIconTip,
  EuiInMemoryTable,
  EuiLink,
  EUI_MODAL_CANCEL_BUTTON,
  EuiOverlayMask,
  EuiPage,
  EuiPageContent,
} from '@elastic/eui';

const INITIAL_PAGE_SIZE = 5;
const PIPELINE_NOT_CENTRALLY_MANAGED_TOOLTIP_TEXT
  = `This pipeline wasn't created using Centralized Configuration Management. It can't be managed or edited here.`;

export class PipelineList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isForbidden: false,
      isLoading: true,
      pageIndex: 0,
      pageSize: INITIAL_PAGE_SIZE,
      showConfirmDeleteModal: false,
      selection: [ ],
    };
  }

  columns = [
    {
      field: 'id',
      name: 'Id',
      sortable: true,
      render: (id, { isCentrallyManaged }) => {
        const { openPipeline } = this.props;
        const openPipelineClicked = () => openPipeline(id);
        return isCentrallyManaged
          ? <EuiLink onClick={openPipelineClicked}>{id}</EuiLink>
          : (
            <span>
              {id} &nbsp;
              <EuiIconTip
                content={PIPELINE_NOT_CENTRALLY_MANAGED_TOOLTIP_TEXT}
                type="questionInCircle"
              />
            </span>
          );
      }
    },
    {
      field: 'description',
      name: 'Description',
      sortable: true,
      truncateText: true,
    },
    {
      field: 'lastModifiedHumanized',
      name: 'Last Modified',
      sortable: true,
    },
    {
      field: 'username',
      name: 'Modified By',
      sortable: true,
    },
    {
      field: 'id',
      name: '',
      render: (id, { isCentrallyManaged }) => {
        const { clonePipeline } = this.props;
        const cloneClicked = () => { clonePipeline(id); };
        return isCentrallyManaged
          ? (
            <EuiButtonEmpty
              iconType="copy"
              onClick={cloneClicked}
              size="xs"
            >
              Clone
            </EuiButtonEmpty>
          )
          : null;
      },
      sortable: false,
    },
  ]

  componentDidMount = () => {
    const {
      isReadOnly,
      licenseService,
      toastNotifications,
    } = this.props;

    this.setState({
      message: 'Loading',
      pipelines: []
    });

    this.loadPipelines()
      .then(() => {
        if (isReadOnly) {
          toastNotifications.addWarning(licenseService.message);
        }
      });

    this.checkMonitoringAccess();
  }

  loadPipelines = () => {
    const {
      isReadOnly,
      licenseService,
      pipelinesService,
      toastNotifications,
    } = this.props;

    return pipelinesService.getPipelineList()
      .then(pipelines => {
        this.setState({
          isLoading: false,
          isForbidden: false,
          pipelines,
        });

      })
      .catch(err => {
        return licenseService.checkValidity()
          .then(() => {
            if (err.status === 403) {
              this.setState({ isLoading: false });

              if (isReadOnly) {
                this.setState({ isForbidden: false });
              } else {
                this.setState({ isForbidden: true });
              }
            } else {
              this.setState({ isForbidden: false });
              toastNotifications.addDanger(`Couldn't load pipeline. Error: '${err.statusText}'.`);
            }
          });
      });
  }

  checkMonitoringAccess = () => {
    const {
      clusterService,
      monitoringService,
    } = this.props;

    clusterService.isClusterInfoAvailable()
      .then(isAvailable => {
        this.setState({
          showAddRoleAlert: !isAvailable,
          showEnableMonitoringAlert: !monitoringService.isMonitoringEnabled(),
        });
      });
  }

  renderNoPermissionCallOut = () => {
    const { isForbidden, isLoading, } = this.state;
    return (isForbidden && !isLoading)
      ? (
        <EuiCallOut
          color="danger"
          iconType="cross"
          title="You do not have permission to manage Logstash pipelines."
        >
          <p>
            Please contact your administrator.
          </p>
        </EuiCallOut>
      )
      : null;
  }

  hideDeletePipelinesModal = () => {
    this.setState({
      showConfirmDeleteModal: false,
    });
  }

  showDeletePipelinesModal = () => {
    this.setState({
      showConfirmDeleteModal: true,
    });
  }

  cancelDeletePipelines = () => {
    this.hideDeletePipelinesModal();
  }

  renderConfirmDeletedPipelinesModal = () => {
    if (!this.state.showConfirmDeleteModal) {
      return null;
    }
    const { selection } = this.state;
    const numPipelinesSelected = selection.length;

    const confirmText = numPipelinesSelected === 1
      ? {
        message: 'You cannot recover a deleted pipeline',
        button: `Delete pipeline`,
        title: `Delete pipeline "${selection[0].id}"`,
      }
      : {
        message: `You cannot recover deleted pipelines.`,
        button: `Delete ${numPipelinesSelected} pipelines`,
        title: `Delete ${numPipelinesSelected} pipelines`,
      };

    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          buttonColor="danger"
          cancelButtonText="Cancel"
          confirmButtonText={confirmText.button}
          defaultFocusedButton={EUI_MODAL_CANCEL_BUTTON}
          onCancel={this.cancelDeletePipelines}
          onConfirm={this.deleteSelectedPipelines}
          title={confirmText.title}
        >
          <p>{confirmText.message}</p>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }

  deleteSelectedPipelines = () => {
    this.hideDeletePipelinesModal();
    const {
      licenseService,
      pipelinesService,
      toastNotifications,
    } = this.props;
    const { selection } = this.state;
    const numPipelinesSelected = selection.length;
    const totalPluralized = pluralize('Pipeline', numPipelinesSelected);

    const pipelineIds = selection.map(({ id }) => id);
    return pipelinesService.deletePipelines(pipelineIds)
      .then(results => {
        const {
          numSuccesses,
          numErrors,
        } = results;
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
        return licenseService.checkValidity()
          .then(() => toastNotifications.addDanger(err));
      });
  }

  onDeleteSelectedPipelines = () => {
    this.showDeletePipelinesModal();
  }

  renderPipelinesTable = () => {
    const {
      createPipeline,
      isReadOnly,
    } = this.props;
    const {
      // TODO: add pagination once EuiInMemoryTable bug fixed: https://github.com/elastic/eui/issues/1007
      // pageIndex,
      // pageSize,
      // pipelines,
      selection
    } = this.state;

    // const pagination = {
    //   pageIndex,
    //   pageSize,
    //   totalItemCount: pipelines.length,
    //   pageSizeOptions: [2, 3, 5, 8]
    // };

    const selectionOptions = {
      selectable: ({ isCentrallyManaged }) => isCentrallyManaged,
      selectableMessage: () => 'the message',
      onSelectionChange: selection => this.setState({ selection }),
    };

    const toolsRight = [
      <EuiButton
        isDisabled={isReadOnly}
        key="btnCreatePipeline"
        fill
        onClick={createPipeline}
      >
        Create pipeline
      </EuiButton>,
      <EuiButton
        isDisabled={!selection.length || isReadOnly}
        key="btnDeletePipelines"
        color="danger"
        onClick={this.onDeleteSelectedPipelines}
      >
        Delete
      </EuiButton>
    ];

    const search = {
      box: { incremental: true },
      filters: [
        {
          type: 'field_value_selection',
          field: 'id',
          name: 'Id',
          multiSelect: false,
          options: this.state.pipelines.map(({ id }) => {
            return {
              value: id,
              name: id,
              view: id,
            };
          }),
        },
      ],
      toolsRight,
    };

    return (
      <EuiInMemoryTable
        columns={this.columns}
        itemId="id"
        items={this.state.pipelines}
        message={this.state.message}
        search={search}
        sorting={true}
        isSelectable={true}
        selection={selectionOptions}
      />
    );
  }

  // TODO: add pagination once EuiInMemoryTable bug fixed: https://github.com/elastic/eui/issues/1007
  // onTableChange = (props) => {
  //   const {
  //     page: {
  //       index,
  //       size,
  //     }
  //   } = props;

  //   this.setState({
  //     pageIndex: index,
  //     pageSize: size,
  //   });
  // };

  render() {
    return (
      <EuiPage style={{ minHeight: '100vh' }}>
        <EuiPageContent
          verticalPosition="center"
          horizontalPosition="center"
        >
          {
            this.renderNoPermissionCallOut()
          }
          <div>
            {
              isEmpty(this.state.pipelines)
                ? null
                : this.renderPipelinesTable()
            }
          </div>
        </EuiPageContent>
        { this.renderConfirmDeletedPipelinesModal() }
      </EuiPage>
    );
  }
}
