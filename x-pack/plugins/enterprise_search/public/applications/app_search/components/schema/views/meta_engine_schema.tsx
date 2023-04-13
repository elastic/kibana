/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useValues, useActions } from 'kea';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DataPanel } from '../../data_panel';
import { getEngineBreadcrumbs } from '../../engine';
import { AppSearchPageTemplate } from '../../layout';

import { MetaEnginesSchemaTable, MetaEnginesConflictsTable } from '../components';
import { SCHEMA_TITLE } from '../constants';
import { MetaEngineSchemaLogic } from '../schema_meta_engine_logic';

export const MetaEngineSchema: React.FC = () => {
  const { loadSchema } = useActions(MetaEngineSchemaLogic);
  const { dataLoading, hasConflicts, conflictingFieldsCount } = useValues(MetaEngineSchemaLogic);

  useEffect(() => {
    loadSchema();
  }, []);

  return (
    <AppSearchPageTemplate
      pageChrome={getEngineBreadcrumbs([SCHEMA_TITLE])}
      pageHeader={{
        pageTitle: i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.schema.metaEngine.title',
          { defaultMessage: 'Meta engine schema' }
        ),
        description: i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.schema.metaEngine.description',
          { defaultMessage: 'Active and inactive fields, by engine.' }
        ),
      }}
      isLoading={dataLoading}
    >
      {hasConflicts && (
        <>
          <EuiCallOut
            iconType="warning"
            color="warning"
            title={i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.schema.metaEngine.conflictsCalloutTitle',
              {
                defaultMessage:
                  '{conflictingFieldsCount, plural, one {# field is} other {# fields are}} not searchable',
                values: { conflictingFieldsCount },
              }
            )}
          >
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.schema.metaEngine.conflictsCalloutDescription',
                {
                  defaultMessage:
                    'The field(s) have an inconsistent field-type across the source engines that make up this meta engine. Apply a consistent field-type from the source engines to make these fields searchable.',
                }
              )}
            </p>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      <DataPanel
        hasBorder
        title={
          <h2>
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.engine.schema.metaEngine.activeFieldsTitle',
              { defaultMessage: 'Active fields' }
            )}
          </h2>
        }
        subtitle={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.schema.metaEngine.activeFieldsDescription',
          { defaultMessage: 'Fields which belong to one or more engine.' }
        )}
      >
        <MetaEnginesSchemaTable />
      </DataPanel>
      <EuiSpacer />
      {hasConflicts && (
        <DataPanel
          hasBorder
          title={
            <h2>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.schema.metaEngine.inactiveFieldsTitle',
                { defaultMessage: 'Inactive fields' }
              )}
            </h2>
          }
          subtitle={i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.schema.metaEngine.inactiveFieldsDescription',
            {
              defaultMessage:
                'These fields have type conflicts. To activate these fields, change types in the source engines to match.',
            }
          )}
        >
          <MetaEnginesConflictsTable />
        </DataPanel>
      )}
    </AppSearchPageTemplate>
  );
};
