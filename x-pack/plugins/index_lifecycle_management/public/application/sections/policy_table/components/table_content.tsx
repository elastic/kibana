/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactElement, useState, Fragment, ReactNode } from 'react';
import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiLink,
  EuiPopover,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTablePagination,
  EuiTableRow,
  EuiTableRowCell,
  EuiText,
  Pager,
  EuiContextMenuPanelDescriptor,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { RIGHT_ALIGNMENT } from '@elastic/eui/lib/services';

import moment from 'moment';
import { ApplicationStart } from 'kibana/public';
import { METRIC_TYPE } from '@kbn/analytics';
import { RouteComponentProps } from 'react-router-dom';
import { reactRouterNavigate } from '../../../../../../../../src/plugins/kibana_react/public';
import { getIndexListUri } from '../../../../../../index_management/public';
import { PolicyFromES } from '../../../../../common/types';
import { getPolicyEditPath } from '../../../services/navigation';
import { sortTable } from '../../../services';
import { trackUiMetric } from '../../../services/ui_metric';

import { UIM_EDIT_CLICK } from '../../../constants';
import { AddPolicyToTemplateConfirmModal } from './add_policy_to_template_confirm_modal';
import { ConfirmDelete } from './confirm_delete';

type PolicyProperty = Extract<
  keyof PolicyFromES,
  'version' | 'name' | 'linkedIndices' | 'modified_date'
>;
const COLUMNS: Array<[PolicyProperty, { label: string; width: number }]> = [
  [
    'name',
    {
      label: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.nameHeader', {
        defaultMessage: 'Name',
      }),
      width: 200,
    },
  ],
  [
    'linkedIndices',
    {
      label: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.linkedIndicesHeader', {
        defaultMessage: 'Linked indices',
      }),
      width: 120,
    },
  ],
  [
    'version',
    {
      label: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.versionHeader', {
        defaultMessage: 'Version',
      }),
      width: 120,
    },
  ],
  [
    'modified_date',
    {
      label: i18n.translate('xpack.indexLifecycleMgmt.policyTable.headers.modifiedDateHeader', {
        defaultMessage: 'Modified date',
      }),
      width: 200,
    },
  ],
];

interface Props {
  policies: PolicyFromES[];
  totalNumber: number;
  navigateToApp: ApplicationStart['navigateToApp'];
  setConfirmModal: (modal: ReactElement | null) => void;
  handleDelete: () => void;
  history: RouteComponentProps['history'];
}
export const TableContent: React.FunctionComponent<Props> = ({
  policies,
  totalNumber,
  navigateToApp,
  setConfirmModal,
  handleDelete,
  history,
}) => {
  const [popoverPolicy, setPopoverPolicy] = useState<string>();
  const [sort, setSort] = useState<{ sortField: PolicyProperty; isSortAscending: boolean }>({
    sortField: 'name',
    isSortAscending: true,
  });
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(0);

  let sortedPolicies = sortTable(policies, sort.sortField, sort.isSortAscending);
  const pager = new Pager(totalNumber, pageSize, currentPage);
  const { firstItemIndex, lastItemIndex } = pager;
  sortedPolicies = sortedPolicies.slice(firstItemIndex, lastItemIndex + 1);

  const isPolicyPopoverOpen = (policyName: string): boolean => popoverPolicy === policyName;
  const closePolicyPopover = (): void => {
    setPopoverPolicy('');
  };
  const openPolicyPopover = (policyName: string): void => {
    setPopoverPolicy(policyName);
  };
  const togglePolicyPopover = (policyName: string): void => {
    if (isPolicyPopoverOpen(policyName)) {
      closePolicyPopover();
    } else {
      openPolicyPopover(policyName);
    }
  };

  const onSort = (column: PolicyProperty) => {
    const newIsSortAscending = sort.sortField === column ? !sort.isSortAscending : true;
    setSort({ sortField: column, isSortAscending: newIsSortAscending });
  };

  const headers = [];
  COLUMNS.forEach(([fieldName, { label, width }]) => {
    const isSorted = sort.sortField === fieldName;
    headers.push(
      <EuiTableHeaderCell
        key={fieldName}
        onSort={() => onSort(fieldName)}
        isSorted={isSorted}
        isSortAscending={sort.isSortAscending}
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

  const buildActionPanelTree = (policy: PolicyFromES): EuiContextMenuPanelDescriptor[] => {
    const hasLinkedIndices = Boolean(policy.linkedIndices && policy.linkedIndices.length);

    const viewIndicesLabel = i18n.translate(
      'xpack.indexLifecycleMgmt.policyTable.viewIndicesButtonText',
      {
        defaultMessage: 'View indices linked to policy',
      }
    );
    const addPolicyToTemplateLabel = i18n.translate(
      'xpack.indexLifecycleMgmt.policyTable.addPolicyToTemplateButtonText',
      {
        defaultMessage: 'Add policy to index template',
      }
    );
    const deletePolicyLabel = i18n.translate(
      'xpack.indexLifecycleMgmt.policyTable.deletePolicyButtonText',
      {
        defaultMessage: 'Delete policy',
      }
    );
    const deletePolicyTooltip = hasLinkedIndices
      ? i18n.translate('xpack.indexLifecycleMgmt.policyTable.deletePolicyButtonDisabledTooltip', {
          defaultMessage: 'You cannot delete a policy that is being used by an index',
        })
      : null;
    const items = [];
    if (hasLinkedIndices) {
      items.push({
        name: viewIndicesLabel,
        icon: 'list',
        onClick: () => {
          navigateToApp('management', {
            path: `/data/index_management${getIndexListUri(`ilm.policy:"${policy.name}"`, true)}`,
          });
        },
      });
    }
    items.push({
      name: addPolicyToTemplateLabel,
      icon: 'plusInCircle',
      onClick: () => {
        setConfirmModal(renderAddPolicyToTemplateConfirmModal(policy));
      },
    });
    items.push({
      name: deletePolicyLabel,
      disabled: hasLinkedIndices,
      icon: 'trash',
      toolTipContent: deletePolicyTooltip,
      onClick: () => {
        setConfirmModal(renderDeleteConfirmModal(policy));
      },
    });
    const panelTree = {
      id: 0,
      title: i18n.translate('xpack.indexLifecycleMgmt.policyTable.policyActionsMenu.panelTitle', {
        defaultMessage: 'Policy options',
      }),
      items,
    };
    return [panelTree];
  };

  const renderRowCell = (fieldName: string, value: string | number | string[]): ReactNode => {
    if (fieldName === 'name') {
      return (
        <EuiLink
          data-test-subj="policyTablePolicyNameLink"
          {...reactRouterNavigate(history, getPolicyEditPath(value as string), () =>
            trackUiMetric(METRIC_TYPE.CLICK, UIM_EDIT_CLICK)
          )}
        >
          {value}
        </EuiLink>
      );
    } else if (fieldName === 'linkedIndices') {
      return (
        <EuiText>
          <b>{value ? (value as string[]).length : '0'}</b>
        </EuiText>
      );
    } else if (fieldName === 'modified_date' && value) {
      return moment(value).format('YYYY-MM-DD HH:mm:ss');
    }
    return value;
  };

  const renderRowCells = (policy: PolicyFromES): ReactElement[] => {
    const { name } = policy;
    const cells = [];
    COLUMNS.forEach(([fieldName, { width }]) => {
      const value: any = policy[fieldName];

      if (fieldName === 'name') {
        cells.push(
          <th
            key={`${fieldName}-${name}`}
            className="euiTableRowCell"
            scope="row"
            data-test-subj={`policyTableCell-${fieldName}`}
          >
            <div className={`euiTableCellContent policyTable__content--${fieldName}`}>
              {renderRowCell(fieldName, value)}
            </div>
          </th>
        );
      } else {
        cells.push(
          <EuiTableRowCell
            key={`${fieldName}-${name}`}
            truncateText={false}
            data-test-subj={`policyTableCell-${fieldName}`}
            className={'policyTable__content--' + fieldName}
            width={width}
          >
            {renderRowCell(fieldName, value)}
          </EuiTableRowCell>
        );
      }
    });
    const button = (
      <EuiButtonEmpty
        data-test-subj="policyActionsContextMenuButton"
        onClick={() => togglePolicyPopover(policy.name)}
        color="primary"
      >
        {i18n.translate('xpack.indexLifecycleMgmt.policyTable.actionsButtonText', {
          defaultMessage: 'Actions',
        })}
      </EuiButtonEmpty>
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
          isOpen={isPolicyPopoverOpen(policy.name)}
          closePopover={closePolicyPopover}
          panelPaddingSize="none"
          anchorPosition="rightUp"
          repositionOnScroll
        >
          <EuiContextMenu initialPanelId={0} panels={buildActionPanelTree(policy)} />
        </EuiPopover>
      </EuiTableRowCell>
    );
    return cells;
  };

  const rows = sortedPolicies.map((policy) => {
    const { name } = policy;
    return <EuiTableRow key={`${name}-row`}>{renderRowCells(policy)}</EuiTableRow>;
  });

  const renderAddPolicyToTemplateConfirmModal = (policy: PolicyFromES): ReactElement => {
    return (
      <AddPolicyToTemplateConfirmModal policy={policy} onCancel={() => setConfirmModal(null)} />
    );
  };

  const renderDeleteConfirmModal = (policy: PolicyFromES): ReactElement => {
    return (
      <ConfirmDelete
        policyToDelete={policy}
        callback={handleDelete}
        onCancel={() => {
          setConfirmModal(null);
        }}
      />
    );
  };

  const renderPager = (): ReactNode => {
    return (
      <EuiTablePagination
        activePage={pager.getCurrentPageIndex()}
        itemsPerPage={pager.itemsPerPage}
        itemsPerPageOptions={[10, 50, 100]}
        pageCount={pager.getTotalPages()}
        onChangeItemsPerPage={setPageSize}
        onChangePage={setCurrentPage}
      />
    );
  };

  return (
    <Fragment>
      <EuiTable>
        <EuiScreenReaderOnly>
          <caption role="status" aria-relevant="text" aria-live="polite">
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.policyTable.captionText"
              defaultMessage="Below is the index lifecycle policy table
                    containing {count, plural, one {# row} other {# rows}} out of {total}."
              values={{ count: sortedPolicies.length, total: totalNumber }}
            />
          </caption>
        </EuiScreenReaderOnly>
        <EuiTableHeader>{headers}</EuiTableHeader>
        <EuiTableBody>{rows}</EuiTableBody>
      </EuiTable>
      <EuiSpacer size="m" />
      {policies.length > 10 ? renderPager() : null}
    </Fragment>
  );
};
