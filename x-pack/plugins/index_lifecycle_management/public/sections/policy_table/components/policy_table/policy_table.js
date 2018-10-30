/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import moment from 'moment-timezone';
import { i18n }  from '@kbn/i18n';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { NoMatch } from '../no_match';
import { BASE_PATH } from '../../../../../common/constants';
import {
  EuiButton,
  EuiLink,
  EuiButtonIcon,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
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
  EuiPageBody,
  EuiPageContent
} from '@elastic/eui';

import { ConfirmDelete } from './confirm_delete';
const HEADERS = {
  name: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.nameHeader', {
    defaultMessage: 'Name',
  }),
  coveredIndices: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.coveredIndicesHeader', {
    defaultMessage: 'Covered Indices',
  }),
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
      showDeleteConfirmation: false
    };
  }
  componentDidMount() {
    this.props.fetchPolicies(true);
  }
  deleteConfirmation() {
    const { policyToDelete } = this.state;
    if (!policyToDelete) {
      return null;
    }
    return (
      <ConfirmDelete
        policyToDelete={policyToDelete}
        callback={this.handleDelete}
        onCancel={() => this.setState({ policyToDelete: null })}
      />
    );
  }
  handleDelete = () => {
    this.props.fetchPolicies(true);
    this.setState({ policyToDelete: null });
  }
  onSort = column => {
    const { sortField, isSortAscending, policySortChanged } = this.props;
    const newIsSortAscending = sortField === column ? !isSortAscending : true;
    policySortChanged(column, newIsSortAscending);
  };

  buildHeader() {
    const { sortField, isSortAscending } = this.props;
    const headers =  Object.entries(HEADERS).map(([fieldName, label]) => {
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
          href={`#${BASE_PATH}policies/edit/${value}`}
        >
          {value}
        </EuiLink>
      );
    } else if (fieldName === 'coveredIndices' && value) {
      return (
        <EuiText>
          <b>{value.length}</b>
        </EuiText>
      );
    } else if (fieldName === 'modified_date' && value) {
      return moment(value).format('YYYY-MM-DD HH:mm:ss');
    }
    return value;
  }

  buildRowCells(policy) {
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
    cells.push(
      <EuiTableRowCell
        key={`delete-${name}`}
        truncateText={false}
        data-test-subj={`policyTableCell-delete-${name}`}
        style={{ width: 100 }}
      >
        <EuiButtonIcon
          aria-label={'Delete policy'}
          color={'danger'}
          onClick={() => this.setState({ policyToDelete: policy })}
          iconType="trash"
        />
      </EuiTableRowCell>
    );
    return cells;
  }

  buildRows() {
    const { policies = [] } = this.props;
    return policies.map(policy => {
      const { name } = policy;
      return (
        <EuiTableRow
          key={`${name}-row`}
        >
          {this.buildRowCells(policy)}
        </EuiTableRow>
      );
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
      policyFilterChanged,
      filter,
      policies,
      intl,
    } = this.props;
    const { selectedPoliciesMap } = this.state;
    const numSelected = Object.keys(selectedPoliciesMap).length;

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent>
            {this.deleteConfirmation()}
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiTitle size="l">
                  <h1>
                    <FormattedMessage
                      id="xpack.indexLifecycleMgmt.policyTable.sectionHeading"
                      defaultMessage="Index lifecycle policy management"
                    />
                  </h1>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText>
                  <p>
                    <FormattedMessage
                      id="xpack.indexLifecycleMgmt.policyTable.sectionDescription"
                      defaultMessage="Create, update, or delete your index lifecycle policies."
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer />
            <EuiFlexGroup gutterSize="l" alignItems="center">
              {numSelected > 0 ? (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj="deletePolicyButton"
                    color="danger"
                    onClick={() => this.setState({ showDeleteConfirmation: true })}
                  >
                    Delete {numSelected} polic{numSelected > 1 ? 'ies' : 'y'}
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
                  placeholder={
                    intl.formatMessage({
                      id: 'xpack.indexLifecycleMgmt.policyTable.systempoliciesSearchInputPlaceholder',
                      defaultMessage: 'Search',
                    })
                  }
                  aria-label="Search policies"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="createUserButton"
                  href={`#${BASE_PATH}policies/edit`}
                >
                  Create new policy
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            {policies.length > 0 ? (
              <EuiTable>
                <EuiTableHeader>
                  {this.buildHeader()}
                </EuiTableHeader>
                <EuiTableBody>{this.buildRows()}</EuiTableBody>
              </EuiTable>
            ) : (
              <NoMatch />
            )}
            <EuiSpacer size="m" />
            {policies.length > 0 ? this.renderPager() : null}
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

export const PolicyTable = injectI18n(PolicyTableUi);
