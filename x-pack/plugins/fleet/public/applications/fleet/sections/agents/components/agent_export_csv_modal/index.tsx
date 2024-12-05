/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiBasicTableColumn, EuiSearchBarProps, EuiTableSelectionType } from '@elastic/eui';
import {
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiNotificationBadge,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { startCase, uniqBy } from 'lodash';

import { useGetAgentExportFieldsQuery } from '../../../../../../hooks';

export interface ExportField {
  field: string;
}

interface Props {
  onClose: () => void;
  onSubmit: (columns: ExportField[]) => void;
  agentCount: number;
}

export const AgentExportCSVModal: React.FunctionComponent<Props> = ({
  onClose,
  onSubmit,
  agentCount,
}) => {
  const fields = [
    { field: 'agent.id' },
    { field: 'status' },
    { field: 'local_metadata.host.hostname' },
    { field: 'policy_id' }, // policy name would need to be enriched
    { field: 'last_checkin' },
    { field: 'local_metadata.elastic.agent.version' },
  ];

  const [selection, setSelection] = useState<ExportField[]>(fields);

  const { data: fieldsData } = useGetAgentExportFieldsQuery({
    enabled: true,
  });
  const items = fieldsData ? uniqBy([...fields, ...fieldsData], 'field') : fields;

  const columns: Array<EuiBasicTableColumn<ExportField>> = [
    {
      field: 'field',
      name: 'Title',
      render: (field: string) => {
        return startCase(field.slice(field.lastIndexOf('.') + 1));
      },
      sortable: true,
      truncateText: true,
    },
    {
      field: 'field',
      name: 'Field',
      sortable: true,
      truncateText: true,
    },
  ];

  const selectionValue: EuiTableSelectionType<ExportField> = {
    selectable: () => true,
    onSelectionChange: (newSelection) => {
      setSelection(newSelection);
    },
    initialSelected: fields,
  };

  const search: EuiSearchBarProps = {
    box: {
      incremental: true,
    },
  };

  return (
    <EuiConfirmModal
      data-test-subj="agentExportCSVModal"
      title={
        <FormattedMessage
          id="xpack.fleet.exportCSV.modalTitle"
          defaultMessage="Download table results as a CSV file"
        />
      }
      onCancel={onClose}
      onConfirm={() => onSubmit(selection)}
      cancelButtonText={
        <FormattedMessage id="xpack.fleet.exportCSV.cancelButtonLabel" defaultMessage="Cancel" />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.fleet.exportCSV.confirmButtonLabel"
          defaultMessage="Download CSV"
        />
      }
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiText color="subdued">
                <FormattedMessage
                  id="xpack.fleet.exportCSV.agentsCountText"
                  defaultMessage="Agents"
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiNotificationBadge color="subdued" size="m">
                {agentCount}
              </EuiNotificationBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSpacer size="s" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <FormattedMessage
              id="xpack.fleet.exportCSV.modalTableDescription"
              defaultMessage="Select the table columns to display in the CSV file"
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiInMemoryTable
            tableCaption="Column"
            items={items}
            itemId="field"
            columns={columns}
            search={search}
            selection={selectionValue}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiConfirmModal>
  );
};
