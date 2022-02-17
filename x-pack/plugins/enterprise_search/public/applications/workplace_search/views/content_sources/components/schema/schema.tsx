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

import { SchemaAddFieldModal, SchemaErrorsCallout } from '../../../../../shared/schema';
import { AppLogic } from '../../../../app_logic';
import { ViewContentHeader } from '../../../../components/shared/view_content_header';
import { NAV } from '../../../../constants';
import { getReindexJobRoute } from '../../../../routes';
import { SourceLayout } from '../source_layout';

import {
  SCHEMA_ADD_FIELD_BUTTON,
  SCHEMA_MANAGE_SCHEMA_TITLE,
  SCHEMA_MANAGE_SCHEMA_DESCRIPTION,
  SCHEMA_FILTER_PLACEHOLDER,
  SCHEMA_SAVE_BUTTON,
  SCHEMA_EMPTY_SCHEMA_TITLE,
  SCHEMA_EMPTY_SCHEMA_DESCRIPTION,
} from './constants';
import { SchemaFieldsTable } from './schema_fields_table';
import { SchemaLogic } from './schema_logic';

export const Schema: React.FC = () => {
  const {
    initializeSchema,
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

  const hasSchemaFields = Object.keys(activeSchema).length > 0;
  const { hasErrors, activeReindexJobId } = mostRecentIndexJob;

  const addFieldButton = (
    <EuiButtonEmpty color="primary" data-test-subj="AddFieldButton" onClick={openAddFieldModal}>
      {SCHEMA_ADD_FIELD_BUTTON}
    </EuiButtonEmpty>
  );

  return (
    <SourceLayout
      pageChrome={[NAV.SCHEMA]}
      pageViewTelemetry="source_schema"
      isLoading={dataLoading}
    >
      <ViewContentHeader
        title={SCHEMA_MANAGE_SCHEMA_TITLE}
        description={SCHEMA_MANAGE_SCHEMA_DESCRIPTION}
      />
      <div>
        {hasErrors && (
          <SchemaErrorsCallout
            viewErrorsPath={getReindexJobRoute(
              sourceId,
              activeReindexJobId.toString(),
              isOrganization
            )}
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
                    <EuiButton
                      disabled={formUnchanged}
                      data-test-subj="UpdateTypesButton"
                      onClick={updateFields}
                      fill
                    >
                      {SCHEMA_SAVE_BUTTON}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer />
            <SchemaFieldsTable />
          </>
        ) : (
          <EuiPanel hasShadow={false} color="subdued">
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
    </SourceLayout>
  );
};
