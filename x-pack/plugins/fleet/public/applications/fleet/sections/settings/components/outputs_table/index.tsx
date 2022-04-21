/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { EuiBasicTable, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useLink } from '../../../../hooks';
import type { Output } from '../../../../types';

import { DefaultBadges } from './badges';

export interface OutputsTableProps {
  outputs: Output[];
  deleteOutput: (output: Output) => void;
}

const NameFlexItemWithMaxWidth = styled(EuiFlexItem)`
  max-width: 250px;
`;

// Allow child to be truncated
const FlexGroupWithMinWidth = styled(EuiFlexGroup)`
  min-width: 0px;
`;

function displayOutputType(type: string) {
  switch (type) {
    case 'elasticsearch':
      return i18n.translate('xpack.fleet.settings.outputsTable.elasticsearchTypeLabel', {
        defaultMessage: 'Elasticsearch',
      });
    default:
      return type;
  }
}

export const OutputsTable: React.FunctionComponent<OutputsTableProps> = ({
  outputs,
  deleteOutput,
}) => {
  const { getHref } = useLink();

  const columns = useMemo((): Array<EuiBasicTableColumn<Output>> => {
    return [
      {
        render: (output: Output) => (
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <NameFlexItemWithMaxWidth grow={false}>
              <p title={output.name} className={`eui-textTruncate`}>
                {output.name}
              </p>
            </NameFlexItemWithMaxWidth>
            {output.is_preconfigured && (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  content={i18n.translate('xpack.fleet.settings.outputsTable.managedTooltip', {
                    defaultMessage: 'This outputs is managed outside of Fleet.',
                  })}
                  type="lock"
                  size="m"
                  color="subdued"
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
        width: '288px',
        name: i18n.translate('xpack.fleet.settings.outputsTable.nameColomnTitle', {
          defaultMessage: 'Name',
        }),
      },
      {
        width: '172px',
        render: (output: Output) => displayOutputType(output.type),
        name: i18n.translate('xpack.fleet.settings.outputsTable.typeColomnTitle', {
          defaultMessage: 'Type',
        }),
      },
      {
        truncateText: true,
        render: (output: Output) => (
          <FlexGroupWithMinWidth direction="column" gutterSize="xs">
            {(output.hosts || []).map((host) => (
              <EuiFlexItem key={host}>
                <p title={host} className={`eui-textTruncate`}>
                  {host}
                </p>
              </EuiFlexItem>
            ))}
          </FlexGroupWithMinWidth>
        ),
        name: i18n.translate('xpack.fleet.settings.outputsTable.hostColomnTitle', {
          defaultMessage: 'Hosts',
        }),
      },
      {
        render: (output: Output) => <DefaultBadges output={output} />,
        width: '200px',
        name: i18n.translate('xpack.fleet.settings.outputSection.defaultColomnTitle', {
          defaultMessage: 'Default',
        }),
      },
      {
        width: '68px',
        render: (output: Output) => {
          const isDeleteVisible =
            !output.is_default && !output.is_default_monitoring && !output.is_preconfigured;

          return (
            <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                {isDeleteVisible && (
                  <EuiButtonIcon
                    color="text"
                    iconType="trash"
                    onClick={() => deleteOutput(output)}
                    title={i18n.translate('xpack.fleet.settings.outputSection.deleteButtonTitle', {
                      defaultMessage: 'Delete',
                    })}
                  />
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  color="text"
                  iconType="pencil"
                  href={getHref('settings_edit_outputs', { outputId: output.id })}
                  title={i18n.translate('xpack.fleet.settings.outputSection.editButtonTitle', {
                    defaultMessage: 'Edit',
                  })}
                  data-test-subj="editOutputBtn"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
        name: i18n.translate('xpack.fleet.settings.outputSection.actionsColomnTitle', {
          defaultMessage: 'Actions',
        }),
      },
    ];
  }, [deleteOutput, getHref]);

  return <EuiBasicTable columns={columns} items={outputs} />;
};
