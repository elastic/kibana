/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiFieldSearch,
  EuiSpacer,
  EuiAccordion,
  EuiPanel,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FIELD_FILTER_CUTOFF } from '../constants';
import { RelevanceTuningLogic } from '../relevance_tuning_logic';

import { RelevanceTuningItem } from './relevance_tuning_item';
import { RelevanceTuningItemContent } from './relevance_tuning_item_content';

import './relevance_tuning_form.scss';

export const RelevanceTuningForm: React.FC = () => {
  const {
    filterInputValue,
    schemaFields,
    filteredSchemaFields,
    schema,
    searchSettings,
  } = useValues(RelevanceTuningLogic);
  const { setFilterValue } = useActions(RelevanceTuningLogic);

  return (
    <section className="relevanceTuningForm">
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
            fullWidth
          />
        )}
        <EuiSpacer />
        {filteredSchemaFields.map((fieldName) => (
          <EuiPanel key={fieldName} className="relevanceTuningForm__panel">
            <EuiAccordion
              key={fieldName}
              id={fieldName}
              buttonContentClassName="relevanceTuningForm__item"
              buttonContent={
                <RelevanceTuningItem
                  name={fieldName}
                  type={schema[fieldName]}
                  boosts={searchSettings.boosts && searchSettings.boosts[fieldName]}
                  field={searchSettings.search_fields[fieldName]}
                />
              }
              paddingSize="s"
            >
              <RelevanceTuningItemContent
                name={fieldName}
                type={schema[fieldName]}
                boosts={searchSettings.boosts && searchSettings.boosts[fieldName]}
                field={searchSettings.search_fields[fieldName]}
              />
            </EuiAccordion>
          </EuiPanel>
        ))}
      </form>
    </section>
  );
};
