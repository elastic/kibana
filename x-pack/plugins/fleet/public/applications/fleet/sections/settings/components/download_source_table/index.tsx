/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { EuiBasicTable, EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useLink } from '../../../../hooks';
import type { DownloadSource } from '../../../../types';

export interface DownloadSourceTableProps {
  downloadSources: DownloadSource[];
  deleteDownloadSource: (ds: DownloadSource) => void;
}

const NameFlexItemWithMaxWidth = styled(EuiFlexItem)`
  max-width: 250px;
`;

// Allow child to be truncated
const FlexGroupWithMinWidth = styled(EuiFlexGroup)`
  min-width: 0px;
`;

export const DownloadSourceTable: React.FunctionComponent<DownloadSourceTableProps> = ({
  downloadSources,
  deleteDownloadSource,
}) => {
  const { getHref } = useLink();

  const columns = useMemo((): Array<EuiBasicTableColumn<DownloadSource>> => {
    return [
      {
        render: (downloadSource: DownloadSource) => (
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <NameFlexItemWithMaxWidth grow={false}>
              <p title={downloadSource.name} className={`eui-textTruncate`}>
                {downloadSource.name}
              </p>
            </NameFlexItemWithMaxWidth>
          </EuiFlexGroup>
        ),
        width: '288px',
        name: i18n.translate('xpack.fleet.settings.downloadSourcesTable.nameColumnTitle', {
          defaultMessage: 'Name',
        }),
      },
      {
        truncateText: true,
        render: (downloadSource: DownloadSource) => (
          <FlexGroupWithMinWidth direction="column" gutterSize="xs">
            <EuiFlexItem key={downloadSource.host}>
              <p title={downloadSource.host} className={`eui-textTruncate`}>
                {downloadSource.host}
              </p>
            </EuiFlexItem>
          </FlexGroupWithMinWidth>
        ),
        name: i18n.translate('xpack.fleet.settings.downloadSourcesTable.hostColumnTitle', {
          defaultMessage: 'Host',
        }),
      },
      {
        width: '68px',
        render: (downloadSource: DownloadSource) => {
          const isDeleteVisible = !downloadSource.is_default;

          return (
            <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                {isDeleteVisible && (
                  <EuiButtonIcon
                    color="text"
                    iconType="trash"
                    onClick={() => deleteDownloadSource(downloadSource)}
                    title={i18n.translate(
                      'xpack.fleet.settings.downloadSourceSection.deleteButtonTitle',
                      {
                        defaultMessage: 'Delete',
                      }
                    )}
                  />
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  color="text"
                  iconType="pencil"
                  href={getHref('settings_edit_download_sources', {
                    downloadSourceId: downloadSource.id,
                  })}
                  title={i18n.translate(
                    'xpack.fleet.settings.downloadSourceSection.editButtonTitle',
                    {
                      defaultMessage: 'Edit',
                    }
                  )}
                  data-test-subj="editDownloadSourceBtn"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
        name: i18n.translate('xpack.fleet.settings.downloadSourceSection.actionsColumnTitle', {
          defaultMessage: 'Actions',
        }),
      },
    ];
  }, [deleteDownloadSource, getHref]);

  return <EuiBasicTable columns={columns} items={downloadSources} />;
};
