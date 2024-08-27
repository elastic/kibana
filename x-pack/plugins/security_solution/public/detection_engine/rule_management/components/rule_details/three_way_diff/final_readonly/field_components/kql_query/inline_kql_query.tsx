/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import type { EuiDescriptionListProps } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { DataSourceType } from '../../../../../../../../../common/api/detection_engine';
import type {
  DiffableAllFields,
  InlineKqlQuery,
} from '../../../../../../../../../common/api/detection_engine';
import { Query, Filters } from '../../../../rule_definition_section';
import * as descriptionStepI18n from '../../../../../../../rule_creation_ui/components/description_step/translations';
import * as i18n from '../translations';
import { getQueryLanguageLabel } from './utils';

interface InlineQueryProps {
  kqlQuery: InlineKqlQuery;
  dataSource?: DiffableAllFields['data_source'];
}

export function InlineKqlQueryReadOnly({ kqlQuery, dataSource }: InlineQueryProps) {
  const listItems: EuiDescriptionListProps['listItems'] = [
    {
      title: descriptionStepI18n.QUERY_LABEL,
      description: <Query query={kqlQuery.query} />,
    },
    {
      title: i18n.LANGUAGE_LABEL,
      description: getQueryLanguageLabel(kqlQuery.language),
    },
  ];

  if (kqlQuery.filters.length > 0 && dataSource) {
    const index =
      dataSource.type === DataSourceType.index_patterns ? dataSource.index_patterns : undefined;

    const dataViewId =
      dataSource.type === DataSourceType.data_view ? dataSource.data_view_id : undefined;

    listItems.push({
      title: descriptionStepI18n.FILTERS_LABEL,
      description: (
        <Filters filters={kqlQuery.filters as Filter[]} index={index} dataViewId={dataViewId} />
      ),
    });
  }

  return <EuiDescriptionList listItems={listItems} />;
}
