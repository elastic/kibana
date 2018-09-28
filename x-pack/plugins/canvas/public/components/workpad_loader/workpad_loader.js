/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiBasicTable,
  EuiButtonIcon,
  EuiPagination,
  EuiSpacer,
  EuiButton,
  EuiToolTip,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { sortByOrder } from 'lodash';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import moment from 'moment';
import { ConfirmModal } from '../confirm_modal';
import { Link } from '../link';
import { Paginate } from '../paginate';
import { WorkpadDropzone } from './workpad_dropzone';
import { WorkpadCreate } from './workpad_create';
import { WorkpadSearch } from './workpad_search';
import { WorkpadUpload } from './workpad_upload';

const formatDate = date => date && moment(date).format('MMM D, YYYY @ h:mma');

class WorkpadLoaderUI extends React.PureComponent {
  static propTypes = {
    workpadId: PropTypes.string.isRequired,
    createWorkpad: PropTypes.func.isRequired,
    findWorkpads: PropTypes.func.isRequired,
    downloadWorkpad: PropTypes.func.isRequired,
    cloneWorkpad: PropTypes.func.isRequired,
    removeWorkpads: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    workpads: PropTypes.object,
  };

  state = {
    deletingWorkpad: false,
    createPending: false,
    sortField: '@timestamp',
    sortDirection: 'desc',
    selectedWorkpads: [],
    pageSize: 10,
  };

  async componentDidMount() {
    // on component load, kick off the workpad search
    this.props.findWorkpads();
  }

  componentWillReceiveProps(newProps) {
    // the workpadId prop will change when a is created or loaded, close the toolbar when it does
    const { workpadId, onClose } = this.props;
    if (workpadId !== newProps.workpadId) onClose();
  }

  // create new empty workpad
  createWorkpad = async () => {
    this.setState({ createPending: true });
    await this.props.createWorkpad();
    this.setState({ createPending: false });
  };

  // create new workpad from uploaded JSON
  uploadWorkpad = async workpad => {
    this.setState({ createPending: true });
    await this.props.createWorkpad(workpad);
    this.setState({ createPending: false });
  };

  // clone existing workpad
  cloneWorkpad = async workpad => {
    this.setState({ createPending: true });
    await this.props.cloneWorkpad(workpad.id);
    this.setState({ createPending: false });
  };

  // Workpad remove methods
  openRemoveConfirm = () => this.setState({ deletingWorkpad: true });

  closeRemoveConfirm = () => this.setState({ deletingWorkpad: false });

  removeWorkpads = () => {
    const { selectedWorkpads } = this.state;
    this.props.removeWorkpads(selectedWorkpads.map(({ id }) => id)).then(remainingIds => {
      const remainingWorkpads =
        remainingIds.length > 0
          ? selectedWorkpads.filter(({ id }) => remainingIds.includes(id))
          : [];

      this.setState({
        deletingWorkpad: false,
        selectedWorkpads: remainingWorkpads,
      });
    });
  };

  // downloads selected workpads as JSON files
  downloadWorkpads = () => {
    this.state.selectedWorkpads.forEach(({ id }) => this.props.downloadWorkpad(id));
  };

  onSelectionChange = selectedWorkpads => {
    this.setState({ selectedWorkpads });
  };

  onTableChange = ({ sort = {} }) => {
    const { field: sortField, direction: sortDirection } = sort;
    this.setState({
      sortField,
      sortDirection,
    });
  };

  renderWorkpadTable = ({ rows, pageNumber, totalPages, setPage }) => {
    const { sortField, sortDirection } = this.state;

    const actions = [
      {
        render: workpad => (
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={
                  <FormattedMessage
                    id="xpack.canvas.workpad.loader.downloadButtonTooltip"
                    defaultMessage="Download"
                  />
                }
              >
                <EuiButtonIcon
                  iconType="sortDown"
                  onClick={() => this.props.downloadWorkpad(workpad.id)}
                  aria-label={this.props.intl.formatMessage({
                    id: 'xpack.canvas.workpad.loader.downloadButtonAriaLabel',
                    defaultMessage: '"Download Workpad',
                  })}
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={
                  <FormattedMessage
                    id="xpack.canvas.workpad.loader.cloneButtonTooltip"
                    defaultMessage="Clone"
                  />
                }
              >
                <EuiButtonIcon
                  iconType="copy"
                  onClick={() => this.cloneWorkpad(workpad)}
                  aria-label={this.props.intl.formatMessage({
                    id: 'xpack.canvas.workpad.loader.cloneButtonAriaLabel',
                    defaultMessage: '"Clone Workpad',
                  })}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
    ];

    const columns = [
      {
        field: 'name',
        name: (
          <FormattedMessage
            id="xpack.canvas.workpad.loader.columnNameTitle"
            defaultMessage="Workpad Name"
          />
        ),
        sortable: true,
        dataType: 'string',
        render: (name, workpad) => {
          const workpadName = workpad.name.length ? workpad.name : <em>{workpad.id}</em>;

          return (
            <Link
              name={
                <FormattedMessage
                  id="xpack.canvas.workpad.loader.loadLinkTitle"
                  defaultMessage="loadWorkpad"
                />
              }
              params={{ id: workpad.id }}
              aria-label={this.props.intl.formatMessage(
                {
                  id: 'xpack.canvas.workpad.loader.loadLinkAriaLabel',
                  defaultMessage: 'Load workpad {workpadName}',
                },
                { workpadName }
              )}
            >
              {workpadName}
            </Link>
          );
        },
      },
      {
        field: '@created',
        name: (
          <FormattedMessage
            id="xpack.canvas.workpad.loader.columnCreatedTitle"
            defaultMessage="Created"
          />
        ),
        sortable: true,
        dataType: 'date',
        width: '20%',
        render: date => formatDate(date),
      },
      {
        field: '@timestamp',
        name: (
          <FormattedMessage
            id="xpack.canvas.workpad.loader.columnUpdatedTitle"
            defaultMessage="Updated"
          />
        ),
        sortable: true,
        dataType: 'date',
        width: '20%',
        render: date => formatDate(date),
      },
      { name: '', actions, width: '5%' },
    ];

    const sorting = {
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    };

    const selection = {
      itemId: 'id',
      onSelectionChange: this.onSelectionChange,
    };

    const emptyTable = (
      <EuiEmptyPrompt
        iconType="importAction"
        title={
          <h2>
            <FormattedMessage
              id="xpack.canvas.workpad.loader.epmtyTableTitle"
              defaultMessage="Add your first workpad"
            />
          </h2>
        }
        titleSize="s"
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.canvas.workpad.loader.epmtyTableDescription"
                defaultMessage="Create a new workpad or drag and drop previously built workpad JSON files here."
              />
            </p>
          </Fragment>
        }
      />
    );

    return (
      <Fragment>
        <WorkpadDropzone onUpload={this.uploadWorkpad}>
          <EuiBasicTable
            compressed
            items={rows}
            itemId="id"
            columns={columns}
            sorting={sorting}
            noItemsMessage={emptyTable}
            onChange={this.onTableChange}
            isSelectable
            selection={selection}
            className="canvasWorkpad__dropzoneTable"
          />
          <EuiSpacer />
          <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiPagination activePage={pageNumber} onPageClick={setPage} pageCount={totalPages} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </WorkpadDropzone>
      </Fragment>
    );
  };

  render() {
    const {
      deletingWorkpad,
      createPending,
      selectedWorkpads,
      sortField,
      sortDirection,
    } = this.state;
    const isLoading = this.props.workpads == null;
    const modalTitle =
      selectedWorkpads.length === 1 ? (
        <FormattedMessage
          id="xpack.canvas.workpad.loader.deleteOneWorkpadButtonTitle"
          defaultMessage="Delete workpad {workpadName}?"
          values={{ workpadName: selectedWorkpads[0].name }}
        />
      ) : (
        <FormattedMessage
          id="xpack.canvas.workpad.loader.deleteWorkpadsButtonTitle"
          defaultMessage="Delete {workpadCount} workpads?"
          values={{ workpadCount: selectedWorkpads.length }}
        />
      );

    const confirmModal = (
      <ConfirmModal
        isOpen={deletingWorkpad}
        title={modalTitle}
        message={
          <FormattedMessage
            id="xpack.canvas.workpad.loader.modalWindowDeleteDescription"
            defaultMessage="You can't recover deleted workpads."
          />
        }
        confirmButtonText={
          <FormattedMessage
            id="xpack.canvas.workpad.loader..modalWindowDeleteButtonTitle"
            defaultMessage="Delete"
          />
        }
        onConfirm={this.removeWorkpads}
        onCancel={this.closeRemoveConfirm}
      />
    );

    let sortedWorkpads = [];

    if (!createPending && !isLoading) {
      const { workpads } = this.props.workpads;
      sortedWorkpads = sortByOrder(workpads, [sortField, '@timestamp'], [sortDirection, 'desc']);
    }

    return (
      <Paginate rows={sortedWorkpads}>
        {pagination => (
          <Fragment>
            <EuiModalHeader className="canvasHomeApp__modalHeader">
              <div style={{ width: '100%' }}>
                <EuiModalHeaderTitle>
                  <FormattedMessage
                    id="xpack.canvas.workpad.loader.modalHeaderTitle"
                    defaultMessage="Canvas workpads"
                  />
                </EuiModalHeaderTitle>
                <EuiSpacer size="l" />
                <EuiFlexGroup justifyContent="spaceBetween">
                  <EuiFlexItem grow={2}>
                    <EuiFlexGroup gutterSize="s">
                      {selectedWorkpads.length > 0 && (
                        <Fragment>
                          <EuiFlexItem grow={false}>
                            <EuiButton
                              size="s"
                              color="secondary"
                              onClick={this.downloadWorkpads}
                              iconType="sortDown"
                            >
                              <FormattedMessage
                                id="xpack.canvas.workpad.loader.downloadButtonTitle"
                                defaultMessage="Download ({workpadCount})"
                                values={{ workpadCount: selectedWorkpads.length }}
                              />
                            </EuiButton>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiButton
                              size="s"
                              color="danger"
                              iconType="trash"
                              onClick={this.openRemoveConfirm}
                            >
                              <FormattedMessage
                                id="xpack.canvas.workpad.loader.deleteButtonTitle"
                                defaultMessage="Delete ({workpadCount})"
                                values={{ workpadCount: selectedWorkpads.length }}
                              />
                            </EuiButton>
                          </EuiFlexItem>
                        </Fragment>
                      )}
                      <EuiFlexItem grow={1}>
                        <WorkpadSearch
                          onChange={text => {
                            pagination.setPage(0);
                            this.props.findWorkpads(text);
                          }}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem grow={2}>
                    <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
                      <EuiFlexItem grow={false}>
                        <WorkpadUpload
                          createPending={createPending}
                          onUpload={this.uploadWorkpad}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <WorkpadCreate
                          createPending={createPending}
                          onCreate={this.createWorkpad}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>
            </EuiModalHeader>
            <EuiModalBody>
              {createPending && (
                <div>
                  <FormattedMessage
                    id="xpack.canvas.workpad.loader.createPendingDescription"
                    defaultMessage="Creating Workpad..."
                  />
                </div>
              )}

              {!createPending &&
                isLoading && (
                  <div>
                    <FormattedMessage
                      id="xpack.canvas.workpad.loader.fetchPendingDescription"
                      defaultMessage="Fetching Workpads..."
                    />
                  </div>
                )}

              {!createPending && !isLoading && this.renderWorkpadTable(pagination)}

              {confirmModal}
            </EuiModalBody>
          </Fragment>
        )}
      </Paginate>
    );
  }
}

export const WorkpadLoader = injectI18n(WorkpadLoaderUI);
