/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import type { EuiDescriptionListProps } from '@elastic/eui';
import type {
  DiffableAllFields,
  InlineKqlQuery,
} from '../../../../../../../../../common/api/detection_engine';
import { Query, Filters } from '../../../../rule_definition_section';
import * as ruleDetailsI18n from '../../../../translations';
import * as descriptionStepI18n from '../../../../../../../rule_creation_ui/components/description_step/translations';
import { getDataSourceProps, getQueryLanguageLabel, typeCheckFilters } from '../../../../helpers';

const defaultI18nLabels = {
  query: descriptionStepI18n.QUERY_LABEL,
  language: ruleDetailsI18n.QUERY_LANGUAGE_LABEL,
  filters: descriptionStepI18n.FILTERS_LABEL,
};

interface InlineQueryProps {
  kqlQuery: InlineKqlQuery;
  dataSource?: DiffableAllFields['data_source'];
  i18nLabels?: {
    query: string;
    language: string;
    filters: string;
  };
}

export function InlineKqlQueryReadOnly({
  kqlQuery,
  dataSource,
  i18nLabels = defaultI18nLabels,
}: InlineQueryProps) {
  const listItems: EuiDescriptionListProps['listItems'] = [
    {
      title: i18nLabels.query,
      description: <Query query={kqlQuery.query} />,
    },
    {
      title: i18nLabels.language,
      description: getQueryLanguageLabel(kqlQuery.language),
    },
  ];

  const filters = typeCheckFilters(kqlQuery.filters);

  if (filters.length > 0) {
    const dataSourceProps = getDataSourceProps(dataSource);

    listItems.push({
      title: i18nLabels.filters,
      description: <Filters filters={filters} {...dataSourceProps} />,
    });
  }

  return <EuiDescriptionList listItems={listItems} />;
}
