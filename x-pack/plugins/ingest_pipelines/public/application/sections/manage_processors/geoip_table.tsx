/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiInMemoryTableProps,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { css } from '@emotion/react';
import React, { useState } from 'react';
import { GeoipDatabase } from './types';
import { AddDatabaseModal } from './add_database_modal';

export const GeoipTable = ({
  items,
  reloadDatabases,
}: {
  items: GeoipDatabase[];
  reloadDatabases: () => void;
}) => {
  const [showModal, setShowModal] = useState<'add' | 'delete' | null>(null);
  const tableProps: EuiInMemoryTableProps<GeoipDatabase> = {
    columns: [
      {
        field: 'name',
        name: i18n.translate('xpack.ingestPipelines.manageProcessors.geoip.list.nameColumnTitle', {
          defaultMessage: 'Database name',
        }),
        sortable: true,
      },
    ],
    items,
  };
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="xpack.ingestPipelines.manageProcessors.geoip.tableTitle"
                defaultMessage="GeoIP"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton fill iconType="plusInCircle" onClick={() => setShowModal('add')}>
            <FormattedMessage
              id="xpack.ingestPipelines.manageProcessors.geoip.addDatabaseButtonLabel"
              defaultMessage="Add database"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />
      <EuiInMemoryTable
        css={css`
          height: 100%;
        `}
        {...tableProps}
      />
      {showModal === 'add' && (
        <AddDatabaseModal closeModal={() => setShowModal(null)} reloadDatabases={reloadDatabases} />
      )}
    </>
  );
};
