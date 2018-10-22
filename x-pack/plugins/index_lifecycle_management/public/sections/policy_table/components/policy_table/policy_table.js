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
import {
  EuiButton,
  EuiLink,
  EuiCheckbox,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiSpacer,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableHeaderCellCheckbox,
  EuiTablePagination,
  EuiTableRow,
  EuiTableRowCell,
  EuiTableRowCellCheckbox,
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
  static getDerivedStateFromProps(props, state) {
    // Deselect any policies which no longer exist, e.g. they've been deleted.
    const { selectedPoliciesMap } = state;
    const policyNames = props.policies.map(policy => policy.name);
    const selectedPolicyNames = Object.keys(selectedPoliciesMap);
    const missingPolicyNames = selectedPolicyNames.filter(selectedpolicyName => {
      return !policyNames.includes(selectedpolicyName);
    });

    if (missingPolicyNames.length) {
      const newMap = { ...selectedPoliciesMap };
      missingPolicyNames.forEach(missingPolicyName => delete newMap[missingPolicyName]);
      return { selectedPoliciesMap: newMap };
    }

    return null;
  }

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
    if (!this.state.showDeleteConfirmation) {
      return null;
    }
    return (
      <ConfirmDelete
        policiesToDelete={this.getSelectedPolicies()}
        callback={this.handleDelete}
      />
    );
  }
  handleDelete = () => {
    this.props.fetchPolicies(true);
    this.setState({ showDeleteConfirmation: false });
  }
  onSort = column => {
    const { sortField, isSortAscending, policySortChanged } = this.props;
    const newIsSortAscending = sortField === column ? !isSortAscending : true;
    policySortChanged(column, newIsSortAscending);
  };

  toggleAll = () => {
    const allSelected = this.areAllItemsSelected();
    if (allSelected) {
      return this.setState({ selectedPoliciesMap: {} });
    }
    const { policies } = this.props;
    const selectedPoliciesMap = {};
    policies.forEach(({ name }) => {
      selectedPoliciesMap[name] = true;
    });
    this.setState({
      selectedPoliciesMap
    });
  };

  toggleItem = name => {
    this.setState(({ selectedPoliciesMap }) => {
      const newMap = { ...selectedPoliciesMap };
      if (newMap[name]) {
        delete newMap[name];
      } else {
        newMap[name] = true;
      }
      return {
        selectedPoliciesMap: newMap
      };
    });
  };

  isItemSelected = name => {
    return !!this.state.selectedPoliciesMap[name];
  };
  getSelectedPolicies() {
    return this.props.policies.filter(({ name }) => {
      return this.isItemSelected(name);
    });
  }
  areAllItemsSelected = () => {
    const { policies } = this.props;
    const unselectedItem = policies.find(
      policy => !this.isItemSelected(policy.name)
    );
    return !unselectedItem;
  };

  buildHeader() {
    const { sortField, isSortAscending } = this.props;
    return Object.entries(HEADERS).map(([fieldName, label]) => {
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
  }

  buildRowCell(fieldName, value) {
    if (fieldName === 'name') {
      return (
        <EuiLink
          className="policyTable__link"
          data-test-subj="policyTablePolicyNameLink"
          onClick={() => {

          }}
        >
          {value}
        </EuiLink>
      );
    } else if (fieldName === 'coveredIndices' && value) {
      return (
        <EuiText>
          <b>{value.length}</b> ({value.join(', ')})
        </EuiText>
      );
    } else if (fieldName === 'modified_date' && value) {
      return moment(value).format('YYYY-MM-DD HH:mm:ss');
    }
    return value;
  }

  buildRowCells(policy) {
    return Object.keys(HEADERS).map(fieldName => {
      const { name } = policy;
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
  }

  buildRows() {
    const { policies = [], detailPanelpolicyName } = this.props;
    return policies.map(policy => {
      const { name } = policy;
      return (
        <EuiTableRow
          isSelected={
            this.isItemSelected(name) || name === detailPanelpolicyName
          }
          key={`${name}-row`}
        >
          <EuiTableRowCellCheckbox key={`checkbox-${name}`}>
            <EuiCheckbox
              type="inList"
              id={`checkboxSelectpolicy-${name}`}
              checked={this.isItemSelected(name)}
              onChange={() => {
                this.toggleItem(name);
              }}
              data-test-subj="policyTableRowCheckbox"
            />
          </EuiTableRowCellCheckbox>
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
                      defaultMessage="Lifecycle policy management"
                    />
                  </h1>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText>
                  <p>
                    <FormattedMessage
                      id="xpack.indexLifecycleMgmt.policyTable.sectionDescription"
                      defaultMessage="Update your index lifecycle policies individually or in bulk"
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
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            {policies.length > 0 ? (
              <EuiTable>
                <EuiTableHeader>
                  <EuiTableHeaderCellCheckbox>
                    <EuiCheckbox
                      id="selectAllPolicies"
                      checked={this.areAllItemsSelected()}
                      onChange={this.toggleAll}
                      type="inList"
                    />
                  </EuiTableHeaderCellCheckbox>
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
