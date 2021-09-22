/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findIndex, forEach, pullAt, pullAllBy } from 'lodash';
import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiSpacer } from '@elastic/eui';
import { produce } from 'immer';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  OsqueryManagerPackagePolicyInputStream,
  OsqueryManagerPackagePolicyInput,
} from '../../../common/types';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { FieldHook } from '../../shared_imports';
import { PackQueriesTable } from '../pack_queries_table';
import { QueryFlyout } from '../queries/query_flyout';
import { OsqueryPackUploader } from './pack_uploader';
import { getSupportedPlatforms } from '../queries/platforms/helpers';

interface QueriesFieldProps {
  field: FieldHook<OsqueryManagerPackagePolicyInput[]>;
  integrationPackageVersion?: string | undefined;
  packId: string;
}

interface GetNewQueryProps {
  id: string;
  interval: string;
  query: string;
  platform?: string | undefined;
  version?: string | undefined;
}

const getNewQuery = (payload: GetNewQueryProps) =>
  produce(
    {
      enabled: true,
      id: payload.id,
      interval: payload.interval,
      query: payload.query,
    },
    (draft) => {
      if (payload.platform) {
        draft.platform = payload.platform;
      }
      if (payload.version && draft.vars) {
        draft.version = payload.version;
      }
      return draft;
    }
  );

const QueriesFieldComponent: React.FC<QueriesFieldProps> = ({
  field,
  integrationPackageVersion,
}) => {
  const [showAddQueryFlyout, setShowAddQueryFlyout] = useState(false);
  const [showEditQueryFlyout, setShowEditQueryFlyout] = useState<number>(-1);
  const [tableSelectedItems, setTableSelectedItems] = useState<
    OsqueryManagerPackagePolicyInputStream[]
  >([]);

  const handleShowAddFlyout = useCallback(() => setShowAddQueryFlyout(true), []);
  const handleHideAddFlyout = useCallback(() => setShowAddQueryFlyout(false), []);
  const handleHideEditFlyout = useCallback(() => setShowEditQueryFlyout(-1), []);

  const { setValue } = field;

  const handleDeleteClick = useCallback(
    (query: any) => {
      const queryIndex = findIndex(field.value, ['id', query.id]);

      if (queryIndex > -1) {
        setValue(
          produce((draft) => {
            pullAt(draft[0], [queryIndex]);

            return draft;
          })
        );
      }
    },
    [field.value, setValue]
  );

  const handleEditClick = useCallback(
    (query: any) => {
      const queryIndex = findIndex(field.value, ['id', query.id]);

      setShowEditQueryFlyout(queryIndex);
    },
    [field.value]
  );

  const handleEditQuery = useCallback(
    (updatedQuery) =>
      new Promise<void>((resolve) => {
        if (showEditQueryFlyout >= 0) {
          setValue(
            produce((draft) => {
              draft[showEditQueryFlyout].id = updatedQuery.id;
              draft[showEditQueryFlyout].interval = updatedQuery.interval;
              draft[showEditQueryFlyout].query = updatedQuery.query;

              if (updatedQuery.platform?.length) {
                draft[showEditQueryFlyout].platform = updatedQuery.platform;
              } else {
                delete draft[showEditQueryFlyout].platform;
              }

              if (updatedQuery.version?.length) {
                draft[showEditQueryFlyout].version = updatedQuery.version;
              } else {
                delete draft[showEditQueryFlyout].version;
              }

              return draft;
            })
          );
        }

        handleHideEditFlyout();
        resolve();
      }),
    [handleHideEditFlyout, setValue, showEditQueryFlyout]
  );

  const handleAddQuery = useCallback(
    (newQuery) =>
      new Promise<void>((resolve) => {
        setValue(
          produce((draft) => {
            draft.push(getNewQuery(newQuery));
            return draft;
          })
        );
        handleHideAddFlyout();
        resolve();
      }),
    [handleHideAddFlyout, setValue]
  );

  const handleDeleteQueries = useCallback(() => {
    setValue(
      produce((draft) => {
        pullAllBy(draft, tableSelectedItems, 'vars.id.value');

        return draft;
      })
    );
    setTableSelectedItems([]);
  }, [setValue, tableSelectedItems]);

  const handlePackUpload = useCallback(
    (newQueries) => {
      setValue(
        produce((draft) => {
          forEach(newQueries, (newQuery, newQueryId) => {
            draff.push(
              getNewQuery({
                id: newQueryId,
                interval: newQuery.interval,
                query: newQuery.query,
                version: newQuery.version,
                platform: getSupportedPlatforms(newQuery.platform),
              })
            );
          });

          return draft;
        })
      );
    },
    [setValue]
  );

  const uniqueQueryIds = useMemo<string[]>(
    () =>
      field.value?.length
        ? field.value.reduce((acc, query) => {
            if (query?.id) {
              acc.push(query.id);
            }

            return acc;
          }, [] as string[])
        : [],
    [field.value]
  );

  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          {!tableSelectedItems.length ? (
            <EuiButton fill onClick={handleShowAddFlyout} iconType="plusInCircle">
              <FormattedMessage
                id="xpack.osquery.pack.queriesForm.addQueryButtonLabel"
                defaultMessage="Add query"
              />
            </EuiButton>
          ) : (
            <EuiButton color="danger" onClick={handleDeleteQueries} iconType="trash">
              <FormattedMessage
                id="xpack.osquery.pack.table.deleteQueriesButtonLabel"
                defaultMessage="Delete {queriesCount, plural, one {# query} other {# queries}}"
                // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                values={{
                  queriesCount: tableSelectedItems.length,
                }}
              />
            </EuiButton>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      {field.value?.length ? (
        <PackQueriesTable
          editMode={true}
          data={field.value}
          onEditClick={handleEditClick}
          onDeleteClick={handleDeleteClick}
          selectedItems={tableSelectedItems}
          setSelectedItems={setTableSelectedItems}
        />
      ) : null}
      <EuiSpacer />
      {<OsqueryPackUploader onChange={handlePackUpload} />}
      {showAddQueryFlyout && (
        <QueryFlyout
          uniqueQueryIds={uniqueQueryIds}
          integrationPackageVersion={integrationPackageVersion}
          onSave={handleAddQuery}
          onClose={handleHideAddFlyout}
        />
      )}
      {showEditQueryFlyout != null && showEditQueryFlyout >= 0 && (
        <QueryFlyout
          uniqueQueryIds={uniqueQueryIds}
          defaultValue={field.value[0].streams[showEditQueryFlyout]?.vars}
          integrationPackageVersion={integrationPackageVersion}
          onSave={handleEditQuery}
          onClose={handleHideEditFlyout}
        />
      )}
    </>
  );
};

export const QueriesField = React.memo(QueriesFieldComponent);
