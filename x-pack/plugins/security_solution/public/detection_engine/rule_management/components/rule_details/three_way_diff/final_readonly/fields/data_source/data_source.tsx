/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import { DataSourceType } from '../../../../../../../../../common/api/detection_engine';
import type { RuleDataSource } from '../../../../../../../../../common/api/detection_engine';
import { Index, DataViewId, DataViewIndexPattern } from '../../../../rule_definition_section';
import * as ruleDetailsI18n from '../../../../translations';
import { assertUnreachable } from '../../../../../../../../../common/utility_types';

interface DataSourceReadOnlyProps {
  dataSource?: RuleDataSource;
}

export function DataSourceReadOnly({ dataSource }: DataSourceReadOnlyProps) {
  if (!dataSource) {
    return null;
  }

  if (dataSource.type === DataSourceType.index_patterns) {
    return (
      <EuiDescriptionList
        listItems={[
          {
            title: ruleDetailsI18n.INDEX_FIELD_LABEL,
            description: <Index index={dataSource.index_patterns} />,
          },
        ]}
      />
    );
  }

  if (dataSource.type === DataSourceType.data_view) {
    return (
      <EuiDescriptionList
        listItems={[
          {
            title: ruleDetailsI18n.DATA_VIEW_ID_FIELD_LABEL,
            description: <DataViewId dataViewId={dataSource.data_view_id} />,
          },
          {
            title: ruleDetailsI18n.DATA_VIEW_INDEX_PATTERN_FIELD_LABEL,
            description: <DataViewIndexPattern dataViewId={dataSource.data_view_id} />,
          },
        ]}
      />
    );
  }

  return assertUnreachable(dataSource);
}
