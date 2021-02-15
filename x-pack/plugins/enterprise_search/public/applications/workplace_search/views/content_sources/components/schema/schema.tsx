/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiPanel,
} from '@elastic/eui';

import { getReindexJobRoute } from '../../../../routes';
import { AppLogic } from '../../../../app_logic';

import { Loading } from '../../../../../shared/loading';
import { ViewContentHeader } from '../../../../components/shared/view_content_header';

import { SchemaAddFieldModal } from '../../../../../shared/schema/schema_add_field_modal';
import { IndexingStatus } from '../../../../../shared/indexing_status';

import { SchemaFieldsTable } from './schema_fields_table';
import { SchemaLogic } from './schema_logic';

import {
  SCHEMA_ADD_FIELD_BUTTON,
  SCHEMA_MANAGE_SCHEMA_TITLE,
  SCHEMA_MANAGE_SCHEMA_DESCRIPTION,
  SCHEMA_FILTER_PLACEHOLDER,
  SCHEMA_UPDATING,
  SCHEMA_SAVE_BUTTON,
  SCHEMA_EMPTY_SCHEMA_TITLE,
  SCHEMA_EMPTY_SCHEMA_DESCRIPTION,
} from './constants';

export const Schema: React.FC = () => {
  const {
    initializeSchema,
    onIndexingComplete,
    addNewField,
    updateFields,
    openAddFieldModal,
    closeAddFieldModal,
    setFilterValue,
  } = useActions(SchemaLogic);

  const {
    sourceId,
    activeSchema,
    filterValue,
    showAddFieldModal,
    addFieldFormErrors,
    mostRecentIndexJob,
    formUnchanged,
    dataLoading,
  } = useValues(SchemaLogic);

  const { isOrganization } = useValues(AppLogic);

  useEffect(() => {
    initializeSchema();
  }, []);

  if (dataLoading) return <Loading />;

  const hasSchemaFields = Object.keys(activeSchema).length > 0;
  const { isActive, hasErrors, percentageComplete, activeReindexJobId } = mostRecentIndexJob;

  const addFieldButton = (
    <EuiButtonEmpty color="primary" data-test-subj="AddFieldButton" onClick={openAddFieldModal}>
      {SCHEMA_ADD_FIELD_BUTTON}
    </EuiButtonEmpty>
  );
  const statusPath = isOrganization
    ? `/api/workplace_search/org/sources/${sourceId}/reindex_job/${activeReindexJobId}/status`
    : `/api/workplace_search/account/sources/${sourceId}/reindex_job/${activeReindexJobId}/status`;

  return (
    <>
      <ViewContentHeader
        title={SCHEMA_MANAGE_SCHEMA_TITLE}
        description={SCHEMA_MANAGE_SCHEMA_DESCRIPTION}
      />
      <div>
        {(isActive || hasErrors) && (
          <IndexingStatus
            itemId={sourceId}
            viewLinkPath={getReindexJobRoute(
              sourceId,
              mostRecentIndexJob.activeReindexJobId.toString(),
              isOrganization
            )}
            statusPath={statusPath}
            onComplete={onIndexingComplete}
            {...mostRecentIndexJob}
          />
        )}
        {hasSchemaFields ? (
          <>
            <EuiSpacer />
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem>
                <EuiFieldSearch
                  value={filterValue}
                  data-test-subj="FilterSchemaInput"
                  placeholder={SCHEMA_FILTER_PLACEHOLDER}
                  onChange={(e) => setFilterValue(e.target.value)}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem>{addFieldButton}</EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {percentageComplete < 100 ? (
                      <EuiButton isLoading fill>
                        {SCHEMA_UPDATING}
                      </EuiButton>
                    ) : (
                      <EuiButton
                        disabled={formUnchanged}
                        data-test-subj="UpdateTypesButton"
                        onClick={updateFields}
                        fill
                      >
                        {SCHEMA_SAVE_BUTTON}
                      </EuiButton>
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer />
            <SchemaFieldsTable />
          </>
        ) : (
          <EuiPanel className="euiPanel--inset">
            <EuiEmptyPrompt
              iconType="managementApp"
              title={<h2>{SCHEMA_EMPTY_SCHEMA_TITLE}</h2>}
              body={<p>{SCHEMA_EMPTY_SCHEMA_DESCRIPTION}</p>}
              actions={addFieldButton}
            />
          </EuiPanel>
        )}
      </div>
      {showAddFieldModal && (
        <SchemaAddFieldModal
          addFieldFormErrors={addFieldFormErrors}
          addNewField={addNewField}
          closeAddFieldModal={closeAddFieldModal}
        />
      )}
    </>
  );
};
