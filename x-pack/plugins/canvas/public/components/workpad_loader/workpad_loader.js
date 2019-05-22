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
  EuiEmptyPrompt,
  EuiFilePicker,
  EuiLink,
} from '@elastic/eui';
import { sortByOrder } from 'lodash';
import moment from 'moment';
import { ConfirmModal } from '../confirm_modal';
import { Link } from '../link';
import { Paginate } from '../paginate';
import { WorkpadDropzone } from './workpad_dropzone';
import { WorkpadCreate } from './workpad_create';
import { WorkpadSearch } from './workpad_search';
import { uploadWorkpad } from './upload_workpad';

const formatDate = date => date && moment(date).format('MMM D, YYYY @ h:mma');

const getDisplayName = (name, workpad, loadedWorkpad) => {
  const workpadName = name.length ? name : <em>{workpad.id}</em>;
  return workpad.id === loadedWorkpad ? <strong>{workpadName}</strong> : workpadName;
};

export class WorkpadLoader extends React.PureComponent {
  static propTypes = {
    workpadId: PropTypes.string.isRequired,
    canUserWrite: PropTypes.bool.isRequired,
    createWorkpad: PropTypes.func.isRequired,
    findWorkpads: PropTypes.func.isRequired,
    downloadWorkpad: PropTypes.func.isRequired,
    cloneWorkpad: PropTypes.func.isRequired,
    removeWorkpads: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    workpads: PropTypes.object,
  };

  state = {
    createPending: false,
    deletingWorkpad: false,
    sortField: '@timestamp',
    sortDirection: 'desc',
    selectedWorkpads: [],
    pageSize: 10,
  };

  async componentDidMount() {
    // on component load, kick off the workpad search
    this.props.findWorkpads();

    // keep track of whether or not the component is mounted, to prevent rogue setState calls
    this._isMounted = true;
  }

  componentWillReceiveProps(newProps) {
    // the workpadId prop will change when a is created or loaded, close the toolbar when it does
    const { workpadId, onClose } = this.props;
    if (workpadId !== newProps.workpadId) {
      onClose();
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  // create new empty workpad
  createWorkpad = async () => {
    this.setState({ createPending: true });
    await this.props.createWorkpad();
    this._isMounted && this.setState({ createPending: false });
  };

  // create new workpad from uploaded JSON
  onUpload = async workpad => {
    this.setState({ createPending: true });
    await this.props.createWorkpad(workpad);
    this._isMounted && this.setState({ createPending: false });
  };

  // clone existing workpad
  cloneWorkpad = async workpad => {
    this.setState({ createPending: true });
    await this.props.cloneWorkpad(workpad.id);
    this._isMounted && this.setState({ createPending: false });
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

      this._isMounted &&
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
    const { canUserWrite, createPending, workpadId: loadedWorkpad } = this.props;

    const actions = [
      {
        render: workpad => (
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiToolTip content="Export">
                <EuiButtonIcon
                  iconType="exportAction"
                  onClick={() => this.props.downloadWorkpad(workpad.id)}
                  aria-label="Export workpad"
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={canUserWrite ? 'Clone' : `You don't have permission to clone workpads`}
              >
                <EuiButtonIcon
                  iconType="copy"
                  onClick={() => this.cloneWorkpad(workpad)}
                  aria-label="Clone Workpad"
                  disabled={!canUserWrite}
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
        name: 'Workpad name',
        sortable: true,
        dataType: 'string',
        render: (name, workpad) => {
          const workpadName = getDisplayName(name, workpad, loadedWorkpad);

          return (
            <Link
              data-test-subj="canvasWorkpadLoaderWorkpad"
              name="loadWorkpad"
              params={{ id: workpad.id }}
              aria-label={`Load workpad ${workpadName}`}
            >
              {workpadName}
            </Link>
          );
        },
      },
      {
        field: '@created',
        name: 'Created',
        sortable: true,
        dataType: 'date',
        width: '20%',
        render: date => formatDate(date),
      },
      {
        field: '@timestamp',
        name: 'Updated',
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
        title={<h2>Add your first workpad</h2>}
        titleSize="s"
        body={
          <Fragment>
            <p>
              Create a new workpad, start from a template, or import a workpad JSON file by dropping
              it here.
            </p>
            <p>
              New to Canvas?{' '}
              <EuiLink href="kibana#/home/tutorial_directory/sampleData">
                Try the sample data workpads
              </EuiLink>
              .
            </p>
          </Fragment>
        }
      />
    );

    return (
      <Fragment>
        <WorkpadDropzone onUpload={this.onUpload} disabled={createPending || !canUserWrite}>
          <EuiBasicTable
            items={rows}
            itemId="id"
            columns={columns}
            sorting={sorting}
            noItemsMessage={emptyTable}
            onChange={this.onTableChange}
            isSelectable
            selection={selection}
            className="canvasWorkpad__dropzoneTable"
            data-test-subj="canvasWorkpadLoaderTable"
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
    const { canUserWrite } = this.props;
    const isLoading = this.props.workpads == null;

    let createButton = (
      <WorkpadCreate
        createPending={createPending}
        onCreate={this.createWorkpad}
        disabled={!canUserWrite}
      />
    );

    let deleteButton = (
      <EuiButton
        color="danger"
        iconType="trash"
        onClick={this.openRemoveConfirm}
        disabled={!canUserWrite}
      >
        {`Delete (${selectedWorkpads.length})`}
      </EuiButton>
    );

    const downloadButton = (
      <EuiButton color="secondary" onClick={this.downloadWorkpads} iconType="exportAction">
        {`Export (${selectedWorkpads.length})`}
      </EuiButton>
    );

    let uploadButton = (
      <EuiFilePicker
        compressed
        className="canvasWorkpad__upload--compressed"
        initialPromptText="Import workpad JSON file"
        onChange={([file]) => uploadWorkpad(file, this.onUpload)}
        accept="application/json"
        disabled={createPending || !canUserWrite}
      />
    );

    if (!canUserWrite) {
      createButton = (
        <EuiToolTip content="You don't have permission to create workpads">
          {createButton}
        </EuiToolTip>
      );
      deleteButton = (
        <EuiToolTip content="You don't have permission to delete workpads">
          {deleteButton}
        </EuiToolTip>
      );
      uploadButton = (
        <EuiToolTip content="You don't have permission to upload workpads">
          {uploadButton}
        </EuiToolTip>
      );
    }

    const modalTitle =
      selectedWorkpads.length === 1
        ? `Delete workpad '${selectedWorkpads[0].name}'?`
        : `Delete ${selectedWorkpads.length} workpads?`;

    const confirmModal = (
      <ConfirmModal
        isOpen={deletingWorkpad}
        title={modalTitle}
        message="You can't recover deleted workpads."
        confirmButtonText="Delete"
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
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={2}>
                <EuiFlexGroup gutterSize="s">
                  {selectedWorkpads.length > 0 && (
                    <Fragment>
                      <EuiFlexItem grow={false}>{downloadButton}</EuiFlexItem>
                      <EuiFlexItem grow={false}>{deleteButton}</EuiFlexItem>
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
                <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" wrap>
                  <EuiFlexItem grow={false}>{uploadButton}</EuiFlexItem>
                  <EuiFlexItem grow={false}>{createButton}</EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer />

            {createPending && <div style={{ width: '100%' }}>Creating Workpad...</div>}

            {!createPending && isLoading && (
              <div style={{ width: '100%' }}>Fetching Workpads...</div>
            )}

            {!createPending && !isLoading && this.renderWorkpadTable(pagination)}

            {confirmModal}
          </Fragment>
        )}
      </Paginate>
    );
  }
}
