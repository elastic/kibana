/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';

import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiIcon,
  EuiButtonIcon,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { FleetServerHost } from '../../../../types';
import { useLink } from '../../../../hooks';

export interface FleetServerHostsTableProps {
  fleetServerHosts: FleetServerHost[];
  deleteFleetServerHost: (fleetServerHost: FleetServerHost) => void;
}

const NameFlexItemWithMaxWidth = styled(EuiFlexItem)`
  max-width: 250px;
`;

// Allow child to be truncated
const FlexGroupWithMinWidth = styled(EuiFlexGroup)`
  min-width: 0px;
`;

export const FleetServerHostsTable: React.FunctionComponent<FleetServerHostsTableProps> = ({
  fleetServerHosts,
  deleteFleetServerHost,
}) => {
  const { getHref } = useLink();

  const columns = useMemo((): Array<EuiBasicTableColumn<FleetServerHost>> => {
    return [
      {
        render: (fleetServerHost: FleetServerHost) => (
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <NameFlexItemWithMaxWidth grow={false}>
              <p title={fleetServerHost.name} className={`eui-textTruncate`}>
                {fleetServerHost.name}
              </p>
            </NameFlexItemWithMaxWidth>
            {fleetServerHost.is_preconfigured && (
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  content={i18n.translate(
                    'xpack.fleet.settings.fleetServerHostsTable.managedTooltip',
                    {
                      defaultMessage:
                        'This Fleet server host is managed outside of Fleet. Please refer to your kibana config file for more info.',
                    }
                  )}
                  type="lock"
                  size="m"
                  color="subdued"
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
        width: '288px',
        name: i18n.translate('xpack.fleet.settings.fleetServerHostsTable.nameColumnTitle', {
          defaultMessage: 'Name',
        }),
      },
      {
        truncateText: true,
        field: 'host_urls',
        render: (urls: string[]) => (
          <FlexGroupWithMinWidth direction="column" gutterSize="xs">
            {urls.map((url) => (
              <EuiFlexItem key={url}>
                <p title={url} className={`eui-textTruncate`}>
                  {url}
                </p>
              </EuiFlexItem>
            ))}
          </FlexGroupWithMinWidth>
        ),
        name: i18n.translate('xpack.fleet.settings.fleetServerHostsTable.hostUrlsColumnTitle', {
          defaultMessage: 'Host URLs',
        }),
      },
      {
        render: (fleetServerHost: FleetServerHost) =>
          fleetServerHost.is_default ? (
            <EuiIcon type="check" data-test-subj="fleetServerHostTable.defaultIcon" />
          ) : null,
        width: '200px',
        name: i18n.translate('xpack.fleet.settings.fleetServerHostsTable.defaultColumnTitle', {
          defaultMessage: 'Default',
        }),
      },
      {
        width: '68px',
        render: (fleetServerHost: FleetServerHost) => {
          const isDeleteVisible = !fleetServerHost.is_default && !fleetServerHost.is_preconfigured;

          return (
            <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                {isDeleteVisible && (
                  <EuiButtonIcon
                    color="text"
                    iconType="trash"
                    onClick={() => deleteFleetServerHost(fleetServerHost)}
                    title={i18n.translate(
                      'xpack.fleet.settings.fleetServerHostsTable.deleteButtonTitle',
                      {
                        defaultMessage: 'Delete',
                      }
                    )}
                    data-test-subj="fleetServerHostsTable.delete.btn"
                  />
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  color="text"
                  iconType="pencil"
                  href={getHref('settings_edit_fleet_server_hosts', {
                    itemId: fleetServerHost.id,
                  })}
                  title={i18n.translate(
                    'xpack.fleet.settings.fleetServerHostsTable.editButtonTitle',
                    {
                      defaultMessage: 'Edit',
                    }
                  )}
                  data-test-subj="fleetServerHostsTable.edit.btn"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
        name: i18n.translate('xpack.fleet.settings.fleetServerHostsTable.actionsColumnTitle', {
          defaultMessage: 'Actions',
        }),
      },
    ];
  }, [getHref, deleteFleetServerHost]);

  return <EuiBasicTable columns={columns} items={fleetServerHosts} />;
};
