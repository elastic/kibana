/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useValues, useActions } from 'kea';

import { EuiPageHeader, EuiPageContentBody, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FlashMessages } from '../../../../shared/flash_messages';
import { Loading } from '../../../../shared/loading';
import { DataPanel } from '../../data_panel';

import { MetaEnginesSchemaTable, MetaEnginesConflictsTable } from '../components';
import { MetaEngineSchemaLogic } from '../schema_meta_engine_logic';

export const MetaEngineSchema: React.FC = () => {
  const { loadSchema } = useActions(MetaEngineSchemaLogic);
  const { dataLoading, hasConflicts, conflictingFieldsCount } = useValues(MetaEngineSchemaLogic);

  useEffect(() => {
    loadSchema();
  }, []);

  if (dataLoading) return <Loading />;

  return (
    <>
      <EuiPageHeader
        pageTitle={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.schema.metaEngine.title',
          { defaultMessage: 'Meta engine schema' }
        )}
        description={i18n.translate(
          'xpack.enterpriseSearch.appSearch.engine.schema.metaEngine.description',
          { defaultMessage: 'Active and inactive fields, by engine.' }
        )}
      />
      <FlashMessages />
      <EuiPageContentBody>
        {hasConflicts && (
          <>
            <EuiCallOut
              iconType="alert"
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
      </EuiPageContentBody>
    </>
  );
};
