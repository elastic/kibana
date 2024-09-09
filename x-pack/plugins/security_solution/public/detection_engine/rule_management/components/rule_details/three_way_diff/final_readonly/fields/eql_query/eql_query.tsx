/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import type { EuiDescriptionListProps } from '@elastic/eui';
import type { DiffableAllFields } from '../../../../../../../../../common/api/detection_engine';
import * as descriptionStepI18n from '../../../../../../../rule_creation_ui/components/description_step/translations';
import { Query, Filters } from '../../../../rule_definition_section';
import { getDataSourceProps, typeCheckFilters } from '../../../../helpers';

interface EqlQueryReadOnlyProps {
  eqlQuery: DiffableAllFields['eql_query'];
  dataSource: DiffableAllFields['data_source'];
}

export function EqlQueryReadOnly({ eqlQuery, dataSource }: EqlQueryReadOnlyProps) {
  const listItems: EuiDescriptionListProps['listItems'] = [
    {
      title: descriptionStepI18n.EQL_QUERY_LABEL,
      description: <Query query={eqlQuery.query} />,
    },
  ];

  const filters = typeCheckFilters(eqlQuery.filters);

  if (filters.length > 0) {
    const dataSourceProps = getDataSourceProps(dataSource);

    listItems.push({
      title: descriptionStepI18n.FILTERS_LABEL,
      description: <Filters filters={filters} {...dataSourceProps} />,
    });
  }

  return <EuiDescriptionList listItems={listItems} />;
}
