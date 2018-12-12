/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import moment from 'moment-timezone';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { BASE_PATH } from '../../../../../common/constants';
import { NoMatch } from '../no_match';
import { getPolicyPath } from '../../../../services/navigation';
import { flattenPanelTree } from '../../../../services/flatten_panel_tree';
import { RIGHT_ALIGNMENT } from '@elastic/eui/lib/services';
import {
  EuiBetaBadge,
  EuiButton,
  EuiLink,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPage,
  EuiPopover,
  EuiContextMenu,
  EuiSpacer,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTablePagination,
  EuiTableRow,
  EuiTableRowCell,
  EuiTitle,
  EuiText,
  EuiPageBody,
  EuiPageContent,
} from '@elastic/eui';

import { ConfirmDelete } from './confirm_delete';
import { AddPolicyToTemplateConfirmModal } from './add_policy_to_template_confirm_modal';
import { getFilteredIndicesUri } from '../../../../../../index_management/public/services/navigation';
const COLUMNS = {
  name: {
    label: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.nameHeader', {
      defaultMessage: 'Name',
    }),
  },
  coveredIndices: {
    label: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.coveredIndicesHeader', {
      defaultMessage: 'Covered indices',
    }),
    width: 120,
  },
  version: {
    label: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.versionHeader', {
      defaultMessage: 'Version',
    }),
    width: 120,
  },
  modified_date: {
    label: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.modifiedDateHeader', {
      defaultMessage: 'Modified date',
    }),
    width: 200,
  },
};

export class PolicyTableUi extends Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedPoliciesMap: {},
      renderConfirmModal: null,
    };
  }
  componentDidMount() {
    this.props.fetchPolicies(true);
  }
  renderEmpty() {
    return (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1>
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.policyTable.emptyPromptTitle"
              defaultMessage="Create your first index lifecycle policy"
            />
          </h1>
        }
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.policyTable.emptyPromptDescription"
                defaultMessage=" An index lifecycle policy helps you manage your indices as they age."
              />
            </p>
          </Fragment>
        }
        actions={this.renderCreatePolicyButton()}
      />
    );
  }
  renderDeleteConfirmModal = () => {
    const { policyToDelete } = this.state;
    if (!policyToDelete) {
      return null;
    }
    return (
      <ConfirmDelete
        policyToDelete={policyToDelete}
        callback={this.handleDelete}
        onCancel={() => this.setState({ renderConfirmModal: null, policyToDelete: null })}
      />
    );
  };
  renderAddPolicyToTemplateConfirmModal = () => {
    const { policyToAddToTemplate } = this.state;
    if (!policyToAddToTemplate) {
      return null;
    }
    return (
      <AddPolicyToTemplateConfirmModal
        policy={policyToAddToTemplate}
        onCancel={() => this.setState({ renderConfirmModal: null, policyToAddToTemplate: null })}
      />
    );
  };
  handleDelete = () => {
    this.props.fetchPolicies(true);
    this.setState({ renderDeleteConfirmModal: null, policyToDelete: null });
  };
  onSort = column => {
    const { sortField, isSortAscending, policySortChanged } = this.props;
    const newIsSortAscending = sortField === column ? !isSortAscending : true;
    policySortChanged(column, newIsSortAscending);
  };

  buildHeader() {
    const { sortField, isSortAscending } = this.props;
    const headers = Object.entries(COLUMNS).map(([fieldName, { label, width }]) => {
      const isSorted = sortField === fieldName;
      return (
        <EuiTableHeaderCell
          key={fieldName}
          onSort={() => this.onSort(fieldName)}
          isSorted={isSorted}
          isSortAscending={isSortAscending}
          data-test-subj={`policyTableHeaderCell-${fieldName}`}
          className={'policyTable__header--' + fieldName}
          width={width}
        >
          {label}
        </EuiTableHeaderCell>
      );
    });
    headers.push(
      <EuiTableHeaderCell
        key="deleteHeader"
        data-test-subj="policyTableHeaderCell-delete"
        width={150}
      />
    );
    return headers;
  }

  buildRowCell(fieldName, value) {
    if (fieldName === 'name') {
      return (
        <EuiLink
          className="policyTable__link"
          data-test-subj="policyTablePolicyNameLink"
          href={getPolicyPath(value)}
        >
          {value}
        </EuiLink>
      );
    } else if (fieldName === 'coveredIndices') {
      return (
        <EuiText>
          <b>{value ? value.length : '0'}</b>
        </EuiText>
      );
    } else if (fieldName === 'modified_date' && value) {
      return moment(value).format('YYYY-MM-DD HH:mm:ss');
    }
    return value;
  }
  renderCreatePolicyButton() {
    return (
      <EuiButton
        href={`#${BASE_PATH}policies/edit`}
        fill
        iconType="plusInCircle"
        data-test-subj="createPolicyButton"
      >
        <FormattedMessage
          id="xpack.indexLifecycleMgmt.policyTable.emptyPrompt.createButtonLabel"
          defaultMessage="Create policy"
        />
      </EuiButton>
    );
  }
  renderConfirmModal() {
    const { renderConfirmModal } = this.state;
    if (renderConfirmModal) {
      return renderConfirmModal();
    } else {
      return null;
    }
  }
  buildActionPanelTree(policy) {
    const { intl } = this.props;
    const hasCoveredIndices = Boolean(policy.coveredIndices && policy.coveredIndices.length);

    const viewIndicesLabel = intl.formatMessage({
      id: 'xpack.indexLifecycleMgmt.policyTable.viewIndicesButtonText',
      defaultMessage: 'View indices linked to policy',
    });
    const addPolicyToTemplateLabel = intl.formatMessage({
      id: 'xpack.indexLifecycleMgmt.policyTable.addPolicyToTemplateButtonText',
      defaultMessage: 'Add policy to index template',
    });
    const deletePolicyLabel = intl.formatMessage({
      id: 'xpack.indexLifecycleMgmt.policyTable.deletePolicyButtonText',
      defaultMessage: 'Delete policy',
    });
    const deletePolicyTooltip = hasCoveredIndices
      ? intl.formatMessage({
        id: 'xpack.indexLifecycleMgmt.policyTable.deletePolicyButtonDisabledTooltip',
        defaultMessage: 'You cannot delete a policy that is being used by an index',
      })
      : null;
    const items = [];
    if (hasCoveredIndices) {
      items.push({
        name: viewIndicesLabel,
        icon: 'list',
        onClick: () => {
          window.location.hash = getFilteredIndicesUri(`ilm.policy:${policy.name}`);
        },
      });
    }
    items.push({
      name: addPolicyToTemplateLabel,
      icon: 'plusInCircle',
      onClick: () =>
        this.setState({
          renderConfirmModal: this.renderAddPolicyToTemplateConfirmModal,
          policyToAddToTemplate: policy,
        }),
    });
    items.push({
      name: deletePolicyLabel,
      disabled: hasCoveredIndices,
      icon: 'trash',
      toolTipContent: deletePolicyTooltip,
      onClick: () =>
        this.setState({
          renderConfirmModal: this.renderDeleteConfirmModal,
          policyToDelete: policy,
        }),
    });
    const panelTree = {
      id: 0,
      title: intl.formatMessage({
        id: 'xpack.indexLifecycleMgmt.policyTable.policyActionsMenu.panelTitle',
        defaultMessage: 'Policy options',
      }),
      items,
    };
    return flattenPanelTree(panelTree);
  }
  togglePolicyPopover = policy => {
    if (this.isPolicyPopoverOpen(policy)) {
      this.closePolicyPopover(policy);
    } else {
      this.openPolicyPopover(policy);
    }
  };
  isPolicyPopoverOpen = policy => {
    return this.state.policyPopover === policy.name;
  };
  closePolicyPopover = policy => {
    if (this.isPolicyPopoverOpen(policy)) {
      this.setState({ policyPopover: null });
    }
  };
  openPolicyPopover = policy => {
    this.setState({ policyPopover: policy.name });
  };
  buildRowCells(policy) {
    const { intl } = this.props;
    const { name } = policy;
    const cells = Object.entries(COLUMNS).map(([fieldName, { width }]) => {
      const value = policy[fieldName];
      return (
        <EuiTableRowCell
          key={`${fieldName}-${name}`}
          truncateText={false}
          data-test-subj={`policyTableCell-${fieldName}`}
          className={'policyTable__content--' + fieldName}
          width={width}
        >
          {this.buildRowCell(fieldName, value)}
        </EuiTableRowCell>
      );
    });
    const button = (
      <EuiButton
        data-test-subj="policyActionsContextMenuButton"
        iconSide="left"
        aria-label="Policy options"
        onClick={() => this.togglePolicyPopover(policy)}
        iconType="arrowDown"
        fill
      >
        {intl.formatMessage({
          id: 'xpack.indexLifecycleMgmt.policyTable.actionsButtonText',
          defaultMessage: 'Actions',
        })}
      </EuiButton>
    );
    cells.push(
      <EuiTableRowCell
        align={RIGHT_ALIGNMENT}
        key={`delete-${name}`}
        truncateText={false}
        data-test-subj={`policyTableCell-actions-${name}`}
        style={{ width: 150 }}
      >
        <EuiPopover
          id="contextMenuPolicy"
          button={button}
          isOpen={this.isPolicyPopoverOpen(policy)}
          closePopover={() => this.closePolicyPopover(policy)}
          panelPaddingSize="none"
          withTitle
          anchorPosition="rightUp"
          repositionOnScroll
        >
          <EuiContextMenu initialPanelId={0} panels={this.buildActionPanelTree(policy)} />
        </EuiPopover>
      </EuiTableRowCell>
    );
    return cells;
  }

  buildRows() {
    const { policies = [] } = this.props;
    return policies.map(policy => {
      const { name } = policy;
      return <EuiTableRow key={`${name}-row`}>{this.buildRowCells(policy)}</EuiTableRow>;
    });
  }

  renderPager() {
    const { pager, policyPageChanged, policyPageSizeChanged } = this.props;
    return (
      <EuiTablePagination
        activePage={pager.getCurrentPageIndex()}
        itemsPerPage={pager.itemsPerPage}
        itemsPerPageOptions={[10, 50, 100]}
        pageCount={pager.getTotalPages()}
        onChangeItemsPerPage={policyPageSizeChanged}
        onChangePage={policyPageChanged}
      />
    );
  }

  onItemSelectionChanged = selectedPolicies => {
    this.setState({ selectedPolicies });
  };

  render() {
    const {
      totalNumberOfPolicies,
      policyFilterChanged,
      filter,
      intl,
      policyListLoaded,
    } = this.props;
    const { selectedPoliciesMap } = this.state;
    const numSelected = Object.keys(selectedPoliciesMap).length;
    let content;
    let tableContent;
    if (totalNumberOfPolicies || !policyListLoaded) {
      if (!policyListLoaded) {
        tableContent = <EuiLoadingSpinner size="m" />;
      } else if (totalNumberOfPolicies > 0) {
        tableContent = (
          <EuiTable>
            <EuiTableHeader>{this.buildHeader()}</EuiTableHeader>
            <EuiTableBody>{this.buildRows()}</EuiTableBody>
          </EuiTable>
        );
      } else {
        tableContent = <NoMatch />;
      }
      content = (
        <Fragment>
          <EuiFlexGroup gutterSize="l" alignItems="center">
            {numSelected > 0 ? (
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="deletePolicyButton"
                  color="danger"
                  onClick={() => this.setState({ showDeleteConfirmation: true })}
                >
                  Delete {numSelected} polic
                  {numSelected > 1 ? 'ies' : 'y'}
                </EuiButton>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem>
              <EuiFieldSearch
                fullWidth
                value={filter}
                onChange={event => {
                  policyFilterChanged(event.target.value);
                }}
                data-test-subj="policyTableFilterInput"
                placeholder={intl.formatMessage({
                  id: 'xpack.indexLifecycleMgmt.policyTable.systempoliciesSearchInputPlaceholder',
                  defaultMessage: 'Search',
                })}
                aria-label="Search policies"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          {tableContent}
        </Fragment>
      );
    } else {
      content = this.renderEmpty();
    }

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent>
            <div className="policyTable__horizontalScroll">
              {this.renderConfirmModal()}
              {totalNumberOfPolicies || !policyListLoaded ? (
                <Fragment>
                  <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup alignItems="center" gutterSize="m">
                        <EuiFlexItem grow={false}>
                          <EuiTitle size="l">
                            <h1>
                              <FormattedMessage
                                id="xpack.indexLifecycleMgmt.policyTable.sectionHeading"
                                defaultMessage="Index lifecycle policies"
                              />
                            </h1>
                          </EuiTitle>
                        </EuiFlexItem>

                        <EuiFlexItem grow={false}>
                          <EuiBetaBadge label="Beta" />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    {totalNumberOfPolicies ? (
                      <EuiFlexItem grow={false}>{this.renderCreatePolicyButton()}</EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                  <EuiSpacer size="s" />
                  <EuiText>
                    <p>
                      <FormattedMessage
                        id="xpack.indexLifecycleMgmt.policyTable.sectionDescription"
                        defaultMessage="Create, update, and delete your index lifecycle policies."
                      />
                    </p>
                  </EuiText>
                </Fragment>
              ) : null}
              <EuiSpacer />
              {content}
              <EuiSpacer size="m" />
              {totalNumberOfPolicies && totalNumberOfPolicies > 10 ? this.renderPager() : null}
            </div>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

export const PolicyTable = injectI18n(PolicyTableUi);
