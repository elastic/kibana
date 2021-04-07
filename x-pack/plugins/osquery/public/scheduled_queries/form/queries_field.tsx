/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findIndex, forEach, pullAt } from 'lodash';
import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiSpacer } from '@elastic/eui';
import { produce } from 'immer';
import React, { useCallback, useState } from 'react';

import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { FieldHook } from '../../shared_imports';
import { ScheduledQueryQueriesTable } from '../scheduled_query_queries_table';
import { AddQueryFlyout } from './add_query_flyout';
import { EditQueryFlyout } from './edit_query_flyout';
import { OsqueryPackUploader } from './pack_uploader';

interface QueriesFieldProps {
  field: FieldHook;
}

const QueriesFieldComponent: React.FC<QueriesFieldProps> = ({ field }) => {
  const [showAddQueryFlyout, setShowAddQueryFlyout] = useState(false);
  const [showEditQueryFlyout, setShowEditQueryFlyout] = useState<number>(-1);

  const handleShowAddFlyout = useCallback(() => setShowAddQueryFlyout(true), []);
  const handleHideAddFlyout = useCallback(() => setShowAddQueryFlyout(false), []);
  const handleHideEditFlyout = useCallback(() => setShowEditQueryFlyout(-1), []);

  const { setValue } = field;

  const handleDeleteClick = useCallback(
    (stream) => {
      // @ts-expect-error update types
      const streamIndex = findIndex(field.value[0].streams, [
        'vars.id.value',
        stream.vars.id.value,
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
    (stream) => {
      // @ts-expect-error update types
      const streamIndex = findIndex(field.value[0].streams, [
        'vars.id.value',
        stream.vars.id.value,
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
          draft[0].streams.push({
            data_stream: { type: 'logs', dataset: `${OSQUERY_INTEGRATION_NAME}.result` },
            enabled: true,
            id: `osquery-${OSQUERY_INTEGRATION_NAME}.result-900083be-ef20-4b25-9896-e0485cf7e88b`,
            vars: {
              id: { type: 'text', value: newQuery.id },
              interval: {
                type: 'integer',
                value: newQuery.interval,
              },
              query: { type: 'text', value: newQuery.query },
            },
          });
          return draft;
        })
      );
      handleHideAddFlyout();
    },
    [handleHideAddFlyout, setValue]
  );

  const handlePackUpload = useCallback(
    (newQueries) => {
      setValue(
        produce((draft) => {
          forEach(newQueries, (newQuery, newQueryId) => {
            draft[0].streams.push({
              data_stream: { type: 'logs', dataset: `${OSQUERY_INTEGRATION_NAME}.result` },
              enabled: true,
              id: `osquery-${OSQUERY_INTEGRATION_NAME}.result-900083be-ef20-4b25-9896-e0485cf7e88b`,
              vars: {
                id: { type: 'text', value: newQueryId },
                interval: {
                  type: 'integer',
                  value: newQuery.interval,
                },
                query: { type: 'text', value: newQuery.query },
              },
            });
          });

          return draft;
        })
      );
    },
    [setValue]
  );

  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton fill onClick={handleShowAddFlyout} iconType="plusInCircle">
            {'Add query'}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      {
        // @ts-expect-error update types
        field.value && field.value[0].streams?.length && (
          <ScheduledQueryQueriesTable
            // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
            data={{ inputs: field.value }}
            // @ts-expect-error update types
            onEditClick={handleEditClick}
            // @ts-expect-error update types
            onDeleteClick={handleDeleteClick}
          />
        )
      }
      <EuiSpacer />
      {
        // @ts-expect-error update types
        <OsqueryPackUploader onChange={handlePackUpload} />
      }
      {showAddQueryFlyout && (
        // @ts-expect-error update types
        <AddQueryFlyout onSave={handleAddQuery} onClose={handleHideAddFlyout} />
      )}
      {showEditQueryFlyout != null && showEditQueryFlyout >= 0 && (
        <EditQueryFlyout
          // @ts-expect-error update types
          defaultValue={field.value[0].streams[showEditQueryFlyout]}
          onSave={handleEditQuery}
          onClose={handleHideEditFlyout}
        />
      )}
    </>
  );
};

export const QueriesField = React.memo(QueriesFieldComponent);
