/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import { findIndex, forEach, pullAt, mapKeys } from 'lodash';

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiSpacer } from '@elastic/eui';

import { produce } from 'immer';
import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import styled from 'styled-components';

import { FieldHook } from '../../shared_imports';
import { ScheduledQueryQueriesTable } from '../../fleet_integration/components/scheduled_queries_table';
import { AddQueryFlyout } from './add_query_flyout';
import { EditQueryFlyout } from './edit_query_flyout';
import { OsqueryPackUploader } from './pack_uploader';

interface PropsRepositoryCombobox {
  field: FieldHook;
  isLoading: boolean;
  repos: string[];
  noSuggestions: boolean;
  globalRepository: string;
}

export const QueriesField = ({ field }: PropsRepositoryCombobox) => {
  const [showAddQueryFlyout, setShowAddQueryFlyout] = useState(false);
  const [showEditQueryFlyout, setShowEditQueryFlyout] = useState<number | null>(null);

  const handleShowAddFlyout = useCallback(() => setShowAddQueryFlyout(true), []);
  const handleHideAddFlyout = useCallback(() => setShowAddQueryFlyout(false), []);
  const handleHideEditFlyout = useCallback(() => setShowEditQueryFlyout(null), []);

  const { setValue, value } = field;

  console.error('field', field);

  const handleDeleteClick = useCallback(
    (stream) => {
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
      if (showEditQueryFlyout) {
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
            data_stream: { type: 'logs', dataset: 'osquery_manager.result' },
            enabled: true,
            id: 'osquery-osquery_manager.result-900083be-ef20-4b25-9896-e0485cf7e88b',
            vars: {
              id: { type: 'text', value: newQuery.id },
              interval: {
                type: 'text',
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
              data_stream: { type: 'logs', dataset: 'osquery_manager.result' },
              enabled: true,
              id: 'osquery-osquery_manager.result-900083be-ef20-4b25-9896-e0485cf7e88b',
              vars: {
                id: { type: 'text', value: newQueryId },
                interval: {
                  type: 'text',
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
      <ScheduledQueryQueriesTable
        data={{ inputs: field.value }}
        onEditClick={handleEditClick}
        onDeleteClick={handleDeleteClick}
      />
      <EuiSpacer />
      <OsqueryPackUploader onChange={handlePackUpload} />
      {showAddQueryFlyout && (
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
