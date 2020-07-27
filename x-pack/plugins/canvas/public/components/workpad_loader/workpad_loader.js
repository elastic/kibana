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
import { orderBy } from 'lodash';
import { ConfirmModal } from '../confirm_modal';
import { Link } from '../link';
import { Paginate } from '../paginate';
import { ComponentStrings } from '../../../i18n';
import { WorkpadDropzone } from './workpad_dropzone';
import { WorkpadCreate } from './workpad_create';
import { WorkpadSearch } from './workpad_search';
import { uploadWorkpad } from './upload_workpad';

const { WorkpadLoader: strings } = ComponentStrings;

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
    formatDate: PropTypes.func.isRequired,
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

  UNSAFE_componentWillReceiveProps(newProps) {
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
  onUpload = async (workpad) => {
    this.setState({ createPending: true });
    await this.props.createWorkpad(workpad);
    this._isMounted && this.setState({ createPending: false });
  };

  // clone existing workpad
  cloneWorkpad = async (workpad) => {
    this.setState({ createPending: true });
    await this.props.cloneWorkpad(workpad.id);
    this._isMounted && this.setState({ createPending: false });
  };

  // Workpad remove methods
  openRemoveConfirm = () => this.setState({ deletingWorkpad: true });

  closeRemoveConfirm = () => this.setState({ deletingWorkpad: false });

  removeWorkpads = () => {
    const { selectedWorkpads } = this.state;

    this.props.removeWorkpads(selectedWorkpads.map(({ id }) => id)).then((remainingIds) => {
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

  onSelectionChange = (selectedWorkpads) => {
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
        render: (workpad) => (
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiToolTip content={strings.getExportToolTip()}>
                <EuiButtonIcon
                  iconType="exportAction"
                  onClick={() => this.props.downloadWorkpad(workpad.id)}
                  aria-label={strings.getExportToolTip()}
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={
                  canUserWrite ? strings.getCloneToolTip() : strings.getNoPermissionToCloneToolTip()
                }
              >
                <EuiButtonIcon
                  iconType="copy"
                  onClick={() => this.cloneWorkpad(workpad)}
                  aria-label={strings.getCloneToolTip()}
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
        name: strings.getTableNameColumnTitle(),
        sortable: true,
        dataType: 'string',
        render: (name, workpad) => {
          const workpadName = getDisplayName(name, workpad, loadedWorkpad);

          return (
            <Link
              data-test-subj="canvasWorkpadLoaderWorkpad"
              name="loadWorkpad"
              params={{ id: workpad.id }}
              aria-label={strings.getLoadWorkpadArialLabel()}
            >
              {workpadName}
            </Link>
          );
        },
      },
      {
        field: '@created',
        name: strings.getTableCreatedColumnTitle(),
        sortable: true,
        dataType: 'date',
        width: '20%',
        render: (date) => this.props.formatDate(date),
      },
      {
        field: '@timestamp',
        name: strings.getTableUpdatedColumnTitle(),
        sortable: true,
        dataType: 'date',
        width: '20%',
        render: (date) => this.props.formatDate(date),
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
        title={<h2>{strings.getEmptyPromptTitle()}</h2>}
        titleSize="s"
        body={
          <Fragment>
            <p>{strings.getEmptyPromptGettingStartedDescription()}</p>
            <p>
              {strings.getEmptyPromptNewUserDescription()}{' '}
              <EuiLink href="home#/tutorial_directory/sampleData">
                {strings.getSampleDataLinkLabel()}
              </EuiLink>
              .
            </p>
          </Fragment>
        }
      />
    );

    return (
      <Fragment>
        <WorkpadDropzone
          onUpload={this.onUpload}
          disabled={createPending || !canUserWrite}
          notify={this.props.notify}
        >
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
          {rows.length > 0 && (
            <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiPagination
                  activePage={pageNumber}
                  onPageClick={setPage}
                  pageCount={totalPages}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
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
        aria-label={strings.getDeleteButtonAriaLabel(selectedWorkpads.length)}
      >
        {strings.getDeleteButtonLabel(selectedWorkpads.length)}
      </EuiButton>
    );

    const downloadButton = (
      <EuiButton
        color="secondary"
        onClick={this.downloadWorkpads}
        iconType="exportAction"
        aria-label={strings.getExportButtonAriaLabel(selectedWorkpads.length)}
      >
        {strings.getExportButtonLabel(selectedWorkpads.length)}
      </EuiButton>
    );

    let uploadButton = (
      <EuiFilePicker
        display="default"
        compressed
        className="canvasWorkpad__upload--compressed"
        initialPromptText={strings.getFilePickerPlaceholder()}
        onChange={([file]) => uploadWorkpad(file, this.onUpload, this.props.notify)}
        accept="application/json"
        disabled={createPending || !canUserWrite}
      />
    );

    if (!canUserWrite) {
      createButton = (
        <EuiToolTip content={strings.getNoPermissionToCreateToolTip()}>{createButton}</EuiToolTip>
      );
      deleteButton = (
        <EuiToolTip content={strings.getNoPermissionToDeleteToolTip()}>{deleteButton}</EuiToolTip>
      );
      uploadButton = (
        <EuiToolTip content={strings.getNoPermissionToUploadToolTip()}>{uploadButton}</EuiToolTip>
      );
    }

    const modalTitle =
      selectedWorkpads.length === 1
        ? strings.getDeleteSingleWorkpadModalTitle(selectedWorkpads[0].name)
        : strings.getDeleteMultipleWorkpadModalTitle(selectedWorkpads.length);

    const confirmModal = (
      <ConfirmModal
        isOpen={deletingWorkpad}
        title={modalTitle}
        message={strings.getDeleteModalDescription()}
        confirmButtonText={strings.getDeleteModalConfirmButtonLabel()}
        onConfirm={this.removeWorkpads}
        onCancel={this.closeRemoveConfirm}
      />
    );

    let sortedWorkpads = [];

    if (!createPending && !isLoading) {
      const { workpads } = this.props.workpads;
      sortedWorkpads = orderBy(workpads, [sortField, '@timestamp'], [sortDirection, 'desc']);
    }

    return (
      <Paginate rows={sortedWorkpads}>
        {(pagination) => (
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
                      onChange={(text) => {
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

            {createPending && (
              <div style={{ width: '100%' }}>{strings.getCreateWorkpadLoadingDescription()}</div>
            )}

            {!createPending && isLoading && (
              <div style={{ width: '100%' }}>{strings.getFetchLoadingDescription()}</div>
            )}

            {!createPending && !isLoading && this.renderWorkpadTable(pagination)}

            {confirmModal}
          </Fragment>
        )}
      </Paginate>
    );
  }
}
