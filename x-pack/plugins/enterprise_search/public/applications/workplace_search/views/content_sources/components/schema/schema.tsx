/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
      Add Field
    </EuiButtonEmpty>
  );
  const statusPath = isOrganization
    ? `/api/workplace_search/org/sources/${sourceId}/reindex_job/${activeReindexJobId}/status`
    : `/api/workplace_search/account/sources/${sourceId}/reindex_job/${activeReindexJobId}/status`;

  return (
    <>
      <ViewContentHeader
        title="Manage source schema"
        description="Add new fields or change the types of existing ones"
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
                  placeholder="Filter schema fields..."
                  onChange={(e) => setFilterValue(e.target.value)}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem>{addFieldButton}</EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {percentageComplete < 100 ? (
                      <EuiButton isLoading={true} fill={true}>
                        Updating schema...
                      </EuiButton>
                    ) : (
                      <EuiButton
                        disabled={formUnchanged}
                        data-test-subj="UpdateTypesButton"
                        onClick={updateFields}
                        fill={true}
                      >
                        Save Schema
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
              title={<h2>Content source does not have a schema</h2>}
              body={
                <p>
                  A schema is created for you once you index some documents. Click below to create
                  schema fields in advance.
                </p>
              }
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
