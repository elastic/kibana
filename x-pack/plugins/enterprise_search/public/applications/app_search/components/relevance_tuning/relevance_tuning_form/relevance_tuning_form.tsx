/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiTitle,
  EuiFieldSearch,
  EuiSpacer,
  EuiAccordion,
  EuiPanel,
  EuiHealth,
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
    filteredSchemaFieldsWithConflicts,
    schema,
    searchSettings,
  } = useValues(RelevanceTuningLogic);
  const { setFilterValue } = useActions(RelevanceTuningLogic);

  return (
    <section className="relevanceTuningForm">
      <form>
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
        <EuiSpacer />
        {schemaFields.length > FIELD_FILTER_CUTOFF && (
          <>
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
            <EuiSpacer />
          </>
        )}
        {filteredSchemaFields.map((fieldName) => (
          <EuiPanel key={fieldName} hasBorder className="relevanceTuningForm__panel">
            <EuiAccordion
              key={fieldName}
              id={fieldName}
              buttonContentClassName="relevanceTuningForm__item"
              buttonContent={
                <RelevanceTuningItem
                  name={fieldName}
                  type={schema[fieldName].type}
                  boosts={searchSettings.boosts && searchSettings.boosts[fieldName]}
                  field={searchSettings.search_fields[fieldName]}
                />
              }
              paddingSize="s"
            >
              <RelevanceTuningItemContent
                name={fieldName}
                type={schema[fieldName].type}
                boosts={searchSettings.boosts && searchSettings.boosts[fieldName]}
                field={searchSettings.search_fields[fieldName]}
              />
            </EuiAccordion>
          </EuiPanel>
        ))}
        <EuiSpacer />
        {filteredSchemaFieldsWithConflicts.length > 0 && (
          <>
            <EuiTitle size="s" data-test-subj="DisabledFieldsSection">
              <h3>
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.disabledFields.title',
                  {
                    defaultMessage: 'Disabled fields',
                  }
                )}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            {filteredSchemaFieldsWithConflicts.map((fieldName) => (
              <EuiPanel key={fieldName} hasBorder className="relevanceTuningForm__panel">
                <EuiTitle size="xs">
                  <h4 data-test-subj="DisabledField">{fieldName}</h4>
                </EuiTitle>
                <EuiHealth color="warning">
                  {i18n.translate(
                    'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.disabledFieldsExplanationMessage',
                    {
                      defaultMessage: 'Inactive due to field-type conflict',
                    }
                  )}
                </EuiHealth>
              </EuiPanel>
            ))}
          </>
        )}
      </form>
    </section>
  );
};
