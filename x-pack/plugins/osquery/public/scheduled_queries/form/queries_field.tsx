/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import { mapKeys } from 'lodash';

import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiBottomBar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiDescribedFormGroup,
  EuiLink,
  EuiTextColor,
  EuiFormRow,
  EuiAccordion,
  EuiSpacer,
  EuiFieldText,
  EuiComboBoxOptionOption,
} from '@elastic/eui';

import { produce } from 'immer';
import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import styled from 'styled-components';

import { ComboBoxField, FieldHook } from '../../shared_imports';
import { useAgentPolicies } from '../../agent_policies';
import { ScheduledQueries } from '../../routes/scheduled_queries';
import { ScheduledQueryQueriesTable } from '../../fleet_integration/components/scheduled_queries_table';
import { AddQueryFlyout } from './add_query_flyout';
import { EditQueryFlyout } from './edit_query_flyout';

interface PropsRepositoryCombobox {
  field: FieldHook;
  isLoading: boolean;
  repos: string[];
  noSuggestions: boolean;
  globalRepository: string;
}

export const QueriesField = ({ field }: PropsRepositoryCombobox) => {
  const [showAddQueryFlyout, setShowAddQueryFlyout] = useState(false);
  const [showEditQueryFlyout, setShowEditQueryFlyout] = useState(null);

  const handleShowAddFlyout = useCallback(() => setShowAddQueryFlyout(true), []);
  const handleHideAddFlyout = useCallback(() => setShowAddQueryFlyout(false), []);
  const handleHideEditFlyout = useCallback(() => setShowEditQueryFlyout(null), []);

  const { setValue, value } = field;

  console.error('field', field);

  const handleEditQuery = useCallback(
    (updatedQuery) => {
      const updatedValue = produce(value, (draft) => {
        draft[0].streams.push({
          data_stream: { type: 'logs', dataset: 'osquery_manager.result' },
          enabled: true,
          id: 'osquery-osquery_manager.result-7e451187-d06d-4e7e-ae43-88f06e3aa9cd',
          vars: {
            id: { type: 'text', value: updatedQuery.id },
            interval: {
              type: 'text',
              value: updatedQuery.interval,
            },
            query: { type: 'text', value: updatedQuery.query },
          },
        });
        return draft;
      });

      setValue(updatedValue);
      handleHideEditFlyout();
    },
    [handleHideEditFlyout, setValue, value]
  );

  const handleAddQuery = useCallback(
    (newQuery) => {
      const updatedValue = produce(value, (draft) => {
        draft[0].streams.push({
          data_stream: { type: 'logs', dataset: 'osquery_manager.result' },
          enabled: true,
          id: 'osquery-osquery_manager.result-7e451187-d06d-4e7e-ae43-88f06e3aa9cd',
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
      });

      setValue(updatedValue);
      handleHideAddFlyout();
    },
    [handleHideAddFlyout, setValue, value]
  );

  console.error('aa', showEditQueryFlyout);

  return (
    <>
      <ScheduledQueryQueriesTable
        data={{ inputs: field.value }}
        onEditClick={setShowEditQueryFlyout}
      />
      <EuiSpacer />
      {showAddQueryFlyout && (
        <AddQueryFlyout onSave={handleAddQuery} onClose={handleHideAddFlyout} />
      )}
      {showEditQueryFlyout && (
        <EditQueryFlyout
          defaultValue={showEditQueryFlyout}
          onSave={handleEditQuery}
          onClose={handleHideAddFlyout}
        />
      )}
      <EuiButton fill onClick={handleShowAddFlyout}>
        {'Add query'}
      </EuiButton>
    </>
  );
};
