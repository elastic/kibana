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
import {
  EuiBetaBadge,
  EuiButton,
  EuiLink,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPage,
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
  EuiToolTip,
  EuiPageBody,
  EuiPageContent,
} from '@elastic/eui';

import { ConfirmDelete } from './confirm_delete';
import { AddPolicyToTemplateConfirmModal } from './add_policy_to_template_confirm_modal';
import { getFilteredIndicesUri } from '../../../../../../index_management/public/services/navigation';
const HEADERS = {
  name: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.nameHeader', {
    defaultMessage: 'Name',
  }),
  coveredIndices: i18n.translate(
    'xpack.indexLifecycleMgmt.policyTable.headers.coveredIndicesHeader',
    {
      defaultMessage: 'Covered Indices',
    }
  ),
  version: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.versionHeader', {
    defaultMessage: 'Version',
  }),
  modified_date: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.modifiedDateHeader', {
    defaultMessage: 'Modified date',
  }),
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
                defaultMessage="Index lifecycle policies help you control your index lifecycle"
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
    const headers = Object.entries(HEADERS).map(([fieldName, label]) => {
      const isSorted = sortField === fieldName;
      return (
        <EuiTableHeaderCell
          key={fieldName}
          onSort={() => this.onSort(fieldName)}
          isSorted={isSorted}
          isSortAscending={isSortAscending}
          data-test-subj={`policyTableHeaderCell-${fieldName}`}
          className={'policyTable__header--' + fieldName}
        >
          {label}
        </EuiTableHeaderCell>
      );
    });
    headers.push(
      <EuiTableHeaderCell
        key="deleteHeader"
        data-test-subj="policyTableHeaderCell-delete"
        style={{ width: 100 }}
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
    } else if (fieldName === 'coveredIndices' && value) {
      return (
        <EuiText>
          <b>{value.length}</b>{' '}
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
          defaultMessage="Create new policy"
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
  buildRowCells(policy) {
    const hasCoveredIndices = policy.coveredIndices && policy.coveredIndices.length;
    const { intl } = this.props;
    const { name } = policy;
    const cells = Object.keys(HEADERS).map(fieldName => {
      const value = policy[fieldName];
      return (
        <EuiTableRowCell
          key={`${fieldName}-${name}`}
          truncateText={false}
          data-test-subj={`policyTableCell-${fieldName}`}
        >
          {this.buildRowCell(fieldName, value)}
        </EuiTableRowCell>
      );
    });
    const viewIndicesLabel = intl.formatMessage({
      id: 'xpack.indexLifecycleMgmt.policyTable.viewIndicesButtonText',
      defaultMessage: 'View indices',
    });
    const addPolicyToTemplateLabel = intl.formatMessage({
      id: 'xpack.indexLifecycleMgmt.policyTable.addPolicyToTemplateButtonText',
      defaultMessage: 'Add policy to index template',
    });
    const deletePolicyLabel = hasCoveredIndices
      ? intl.formatMessage({
        id: 'xpack.indexLifecycleMgmt.policyTable.deletePolicyButtonDisabledText',
        defaultMessage: 'Cannot delete a policy that is used by an index',
      })
      : intl.formatMessage({
        id: 'xpack.indexLifecycleMgmt.policyTable.deletePolicyButtonDisabledText',
        defaultMessage: 'Delete policy',
      });
    cells.push(
      <EuiTableRowCell
        key={`delete-${name}`}
        truncateText={false}
        data-test-subj={`policyTableCell-delete-${name}`}
        style={{ width: 100 }}
      >
        <EuiToolTip position="bottom" content={deletePolicyLabel}>
          <EuiButtonIcon
            isDisabled={hasCoveredIndices}
            aria-label={deletePolicyLabel}
            color={hasCoveredIndices ? 'disabled' : 'danger'}
            onClick={() =>
              this.setState({
                renderConfirmModal: this.renderDeleteConfirmModal,
                policyToDelete: policy,
              })
            }
            iconType="trash"
          />
        </EuiToolTip>
        {hasCoveredIndices ? (
          <EuiToolTip position="bottom" content={viewIndicesLabel}>
            <EuiButtonIcon
              color="primary"
              aria-label={viewIndicesLabel}
              href={getFilteredIndicesUri(`ilm.policy:${policy.name}`)}
              iconType="list"
            />
          </EuiToolTip>
        ) : null}
        <EuiToolTip position="bottom" content={addPolicyToTemplateLabel}>
          <EuiButtonIcon
            aria-label={addPolicyToTemplateLabel}
            onClick={() =>
              this.setState({
                renderConfirmModal: this.renderAddPolicyToTemplateConfirmModal,
                policyToAddToTemplate: policy,
              })
            }
            iconType="plusInCircle"
          />
        </EuiToolTip>
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
      policies,
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
      } else if (policies.length > 0) {
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
            {this.renderConfirmModal()}
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
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
              {policies.length ? (
                <EuiFlexItem grow={false}>{this.renderCreatePolicyButton()}</EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
            <EuiBetaBadge label="Beta" />
            <EuiSpacer size="s" />
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.policyTable.sectionDescription"
                  defaultMessage="Create, update, or delete your index lifecycle policies."
                />
              </p>
            </EuiText>

            <EuiSpacer />
            {content}
            <EuiSpacer size="m" />
            {policies.length ? this.renderPager() : null}
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

export const PolicyTable = injectI18n(PolicyTableUi);
