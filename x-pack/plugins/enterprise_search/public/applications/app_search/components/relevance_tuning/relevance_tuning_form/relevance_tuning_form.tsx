/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiFieldSearch,
  EuiSpacer,
} from '@elastic/eui';
import { useActions, useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { RelevanceTuningLogic } from '../relevance_tuning_logic';
import { FIELD_FILTER_CUTOFF } from '../constants';

export const RelevanceTuningForm: React.FC = () => {
  const { filterInputValue, schemaFields } = useValues(RelevanceTuningLogic);
  const { setFilterValue } = useActions(RelevanceTuningLogic);

  return (
    <section>
      <form>
        {/* TODO SchemaConflictCallout */}

        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="m">
              <h2>
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.manageFields.title',
                  {
                    defaultMessage: 'Manage fields',
                  }
                )}
              </h2>
            </EuiTitle>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        {schemaFields.length > FIELD_FILTER_CUTOFF && (
          <>
            <EuiSpacer />
            <EuiFieldSearch
              value={filterInputValue}
              onChange={(e) => setFilterValue(e.target.value)}
              placeholder={i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.manageFields.filterPlaceholder',
                {
                  defaultMessage: 'Filter {schemaFieldsLength} fields...',
                  values: {
                    schemaFieldsLength: schemaFields.length,
                  },
                }
              )}
              fullWidth={true}
            />
          </>
        )}
      </form>
    </section>
  );
};
