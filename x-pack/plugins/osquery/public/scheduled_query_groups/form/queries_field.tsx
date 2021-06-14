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

import { PackagePolicyInput, PackagePolicyInputStream } from '../../../../fleet/common';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { FieldHook } from '../../shared_imports';
import { ScheduledQueryGroupQueriesTable } from '../scheduled_query_group_queries_table';
import { AddQueryFlyout } from './add_query_flyout';
import { EditQueryFlyout } from './edit_query_flyout';
import { OsqueryPackUploader } from './pack_uploader';

interface QueriesFieldProps {
  field: FieldHook<PackagePolicyInput[]>;
  scheduledQueryGroupId: string;
}

interface GetNewStreamProps {
  id: string;
  interval: string;
  query: string;
  scheduledQueryGroupId?: string;
}

const getNewStream = ({ id, interval, query, scheduledQueryGroupId }: GetNewStreamProps) => ({
  data_stream: { type: 'logs', dataset: `${OSQUERY_INTEGRATION_NAME}.result` },
  enabled: true,
  id: scheduledQueryGroupId
    ? `osquery-${OSQUERY_INTEGRATION_NAME}.result-${scheduledQueryGroupId}`
    : null,
  vars: {
    id: { type: 'text', value: id },
    interval: {
      type: 'integer',
      value: interval,
    },
    query: { type: 'text', value: query },
  },
});

const QueriesFieldComponent: React.FC<QueriesFieldProps> = ({ field, scheduledQueryGroupId }) => {
  const [showAddQueryFlyout, setShowAddQueryFlyout] = useState(false);
  const [showEditQueryFlyout, setShowEditQueryFlyout] = useState<number>(-1);
  const [tableSelectedItems, setTableSelectedItems] = useState<PackagePolicyInputStream[]>([]);

  const handleShowAddFlyout = useCallback(() => setShowAddQueryFlyout(true), []);
  const handleHideAddFlyout = useCallback(() => setShowAddQueryFlyout(false), []);
  const handleHideEditFlyout = useCallback(() => setShowEditQueryFlyout(-1), []);

  const { setValue } = field;

  const handleDeleteClick = useCallback(
    (stream: PackagePolicyInputStream) => {
      const streamIndex = findIndex(field.value[0].streams, [
        'vars.id.value',
        stream.vars?.id.value,
      ]);

      if (streamIndex > -1) {
        setValue(
          produce((draft) => {
            pullAt(draft[0].streams, [streamIndex]);

            return draft;
          })
        );
      }
    },
    [field.value, setValue]
  );

  const handleEditClick = useCallback(
    (stream: PackagePolicyInputStream) => {
      const streamIndex = findIndex(field.value[0].streams, [
        'vars.id.value',
        stream.vars?.id.value,
      ]);

      setShowEditQueryFlyout(streamIndex);
    },
    [field.value]
  );

  const handleEditQuery = useCallback(
    (updatedQuery) => {
      if (showEditQueryFlyout >= 0) {
        setValue(
          produce((draft) => {
            draft[0].streams[showEditQueryFlyout].vars.id.value = updatedQuery.id;
            draft[0].streams[showEditQueryFlyout].vars.interval.value = updatedQuery.interval;
            draft[0].streams[showEditQueryFlyout].vars.query.value = updatedQuery.query;

            return draft;
          })
        );
      }

      handleHideEditFlyout();
    },
    [handleHideEditFlyout, setValue, showEditQueryFlyout]
  );

  const handleAddQuery = useCallback(
    (newQuery) => {
      setValue(
        produce((draft) => {
          draft[0].streams.push(
            getNewStream({
              ...newQuery,
              scheduledQueryGroupId,
            })
          );
          return draft;
        })
      );
      handleHideAddFlyout();
    },
    [handleHideAddFlyout, scheduledQueryGroupId, setValue]
  );

  const handleDeleteQueries = useCallback(() => {
    setValue(
      produce((draft) => {
        pullAllBy(draft[0].streams, tableSelectedItems, 'vars.id.value');

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
            draft[0].streams.push(
              getNewStream({
                id: newQueryId,
                interval: newQuery.interval,
                query: newQuery.query,
                scheduledQueryGroupId,
              })
            );
          });

          return draft;
        })
      );
    },
    [scheduledQueryGroupId, setValue]
  );

  const tableData = useMemo(() => ({ inputs: field.value }), [field.value]);

  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          {!tableSelectedItems.length ? (
            <EuiButton fill onClick={handleShowAddFlyout} iconType="plusInCircle">
              <FormattedMessage
                id="xpack.osquery.scheduledQueryGroup.queriesForm.addQueryButtonLabel"
                defaultMessage="Add query"
              />
            </EuiButton>
          ) : (
            <EuiButton color="danger" onClick={handleDeleteQueries} iconType="trash">
              <FormattedMessage
                id="xpack.osquery.scheduledQueryGroup.table.deleteQueriesButtonLabel"
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
      {field.value && field.value[0].streams?.length ? (
        <ScheduledQueryGroupQueriesTable
          editMode={true}
          data={tableData}
          onEditClick={handleEditClick}
          onDeleteClick={handleDeleteClick}
          selectedItems={tableSelectedItems}
          setSelectedItems={setTableSelectedItems}
        />
      ) : null}
      <EuiSpacer />
      {<OsqueryPackUploader onChange={handlePackUpload} />}
      {showAddQueryFlyout && (
        // @ts-expect-error update types
        <AddQueryFlyout onSave={handleAddQuery} onClose={handleHideAddFlyout} />
      )}
      {showEditQueryFlyout != null && showEditQueryFlyout >= 0 && (
        <EditQueryFlyout
          defaultValue={field.value[0].streams[showEditQueryFlyout]}
          onSave={handleEditQuery}
          onClose={handleHideEditFlyout}
        />
      )}
    </>
  );
};

export const QueriesField = React.memo(QueriesFieldComponent);
