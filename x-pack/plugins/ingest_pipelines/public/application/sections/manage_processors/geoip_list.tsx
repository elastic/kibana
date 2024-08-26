/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiInMemoryTableProps,
  EuiPageTemplate,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { SectionLoading, useKibana } from '../../../shared_imports';
import type { GeoipDatabase } from './types';
import { getTypeLabel } from './constants';
import { EmptyList } from './empty_list';
import { AddDatabaseModal } from './add_database_modal';
import { DeleteDatabaseModal } from './delete_database_modal';
import { getErrorMessage } from './get_error_message';

export const GeoipList: React.FunctionComponent = () => {
  const { services } = useKibana();
  const { data, isLoading, error, resendRequest } = services.api.useLoadGeoipDatabases();
  const [showModal, setShowModal] = useState<'add' | 'delete' | null>(null);
  const [databaseToDelete, setDatabaseToDelete] = useState<GeoipDatabase | null>(null);
  const onDatabaseDelete = (item: GeoipDatabase) => {
    setDatabaseToDelete(item);
    setShowModal('delete');
  };
  let content: JSX.Element;
  const addDatabaseButton = (
    <EuiButton
      fill
      iconType="plusInCircle"
      onClick={() => {
        setShowModal('add');
      }}
    >
      <FormattedMessage
        id="xpack.ingestPipelines.manageProcessors.geoip.addDatabaseButtonLabel"
        defaultMessage="Add database"
      />
    </EuiButton>
  );
  const tableProps: EuiInMemoryTableProps<GeoipDatabase> = {
    columns: [
      {
        field: 'name',
        name: i18n.translate('xpack.ingestPipelines.manageProcessors.geoip.list.nameColumnTitle', {
          defaultMessage: 'Database name',
        }),
        sortable: true,
      },
      {
        field: 'type',
        name: i18n.translate('xpack.ingestPipelines.manageProcessors.geoip.list.typeColumnTitle', {
          defaultMessage: 'Type',
        }),
        sortable: true,
        render: (type: GeoipDatabase['type']) => {
          return getTypeLabel(type);
        },
      },
      {
        name: 'Actions',
        actions: [
          {
            name: 'Delete',
            description: 'Delete this database',
            icon: 'trash',
            color: 'danger',
            onClick: onDatabaseDelete,
            type: 'icon',
          },
        ],
      },
    ],
    items: data ?? [],
  };
  if (error) {
    content = (
      <EuiPageTemplate.EmptyPrompt
        color="danger"
        iconType="warning"
        title={
          <h2 data-test-subj="geoipListLoadingError">
            <FormattedMessage
              id="xpack.ingestPipelines.manageProcessors.geoip.list.loadErrorTitle"
              defaultMessage="Unable to load geoIP databases"
            />
          </h2>
        }
        body={<p>{getErrorMessage(error)}</p>}
        actions={
          <EuiButton onClick={resendRequest} iconType="refresh" color="danger">
            <FormattedMessage
              id="xpack.ingestPipelines.manageProcessors.geoip.list.geoipListReloadButton"
              defaultMessage="Try again"
            />
          </EuiButton>
        }
      />
    );
  } else if (isLoading && !data) {
    content = (
      <SectionLoading data-test-subj="sectionLoading">
        <FormattedMessage
          id="xpack.ingestPipelines.manageProcessors.geoip.list.loadingMessage"
          defaultMessage="Loading geoIP databases..."
        />
      </SectionLoading>
    );
  } else if (data && data.length === 0) {
    content = <EmptyList addDatabaseButton={addDatabaseButton} />;
  } else {
    content = (
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
          <EuiFlexItem grow={false}>{addDatabaseButton}</EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />
        <EuiInMemoryTable
          css={css`
            height: 100%;
          `}
          {...tableProps}
        />
      </>
    );
  }
  return (
    <>
      {content}
      {showModal === 'add' && (
        <AddDatabaseModal
          closeModal={() => setShowModal(null)}
          reloadDatabases={resendRequest}
          databases={data!}
        />
      )}
      {showModal === 'delete' && databaseToDelete && (
        <DeleteDatabaseModal
          database={databaseToDelete}
          reloadDatabases={resendRequest}
          closeModal={() => setShowModal(null)}
        />
      )}
    </>
  );
};
