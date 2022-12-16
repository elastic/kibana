/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import { EuiCode, EuiToolTip } from '@elastic/eui';
import React from 'react';

import { EcsAllowedValues } from './ecs_allowed_values';
import { TruncatedText } from '../../../../detection_engine/rule_monitoring/components/basic/text/truncated_text';
import type { AllowedValue, EnrichedFieldMetadata, UnallowedValueCount } from '../types';

import * as i18n from './translations';
import { IndexInvalidValues } from './index_invalid_values';

export const EMPTY_PLACEHOLDER = '-';

export const getTableColumns = (): Array<EuiTableFieldDataColumnType<EnrichedFieldMetadata>> => [
  {
    field: 'indexFieldName',
    name: i18n.FIELD,
    sortable: true,
    truncateText: false,
    width: '20%',
  },
  {
    field: 'type',
    name: i18n.ECS_MAPPING,
    render: (type: string) => <EuiCode>{type != null ? type : EMPTY_PLACEHOLDER}</EuiCode>,
    sortable: true,
    truncateText: false,
    width: '15%',
  },
  {
    field: 'indexFieldType',
    name: i18n.INDEX_MAPPING,
    render: (indexFieldType: string) => <EuiCode>{indexFieldType}</EuiCode>,
    sortable: true,
    truncateText: false,
    width: '15%',
  },
  {
    field: 'allowed_values',
    name: i18n.ECS_ALLOWED_VALUES,
    render: (allowedValues: AllowedValue[] | undefined) => (
      <EcsAllowedValues allowedValues={allowedValues} />
    ),
    sortable: false,
    truncateText: false,
    width: '20%',
  },
  {
    field: 'indexInvalidValues',
    name: i18n.INDEX_UNALLOWED_VALUES,
    render: (indexInvalidValues: UnallowedValueCount[]) => (
      <IndexInvalidValues indexInvalidValues={indexInvalidValues} />
    ),
    sortable: false,
    truncateText: false,
    width: '20%',
  },
  {
    field: 'description',
    name: i18n.ECS_DESCRIPTION,
    render: (description: string) =>
      description != null ? (
        <EuiToolTip content={description}>
          <TruncatedText text={description} />
        </EuiToolTip>
      ) : (
        EMPTY_PLACEHOLDER
      ),
    sortable: false,
    truncateText: false,
    width: '10%',
  },
];
