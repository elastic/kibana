/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import numeral from '@elastic/numeral';

import type { FlattenedBucket } from '../../../../common/components/alerts_treemap/types';
import { DefaultDraggable } from '../../../../common/components/draggables';
import type { GenericBuckets } from '../../../../../common/search_strategy/common';
import * as i18n from './translations';
import { DEFAULT_STACK_BY_FIELD0_SIZE, DEFAULT_STACK_BY_FIELD1_SIZE } from './helpers';

export const getSingleGroupByAlertsCountTableColumns = ({
  defaultNumberFormat,
  stackByField0,
}: {
  defaultNumberFormat: string;
  stackByField0: string;
}): Array<EuiBasicTableColumn<GenericBuckets>> => [
  {
    'data-test-subj': 'stackByField0Key',
    field: 'key',
    name: stackByField0,
    render: function DraggableStackOptionField(value: string) {
      return (
        <DefaultDraggable
          isDraggable={false}
          field={stackByField0}
          hideTopN={true}
          id={`alert-count-draggable-stackByField0-${stackByField0}-${value}`}
          value={value}
          tooltipContent={null}
        />
      );
    },
    truncateText: false,
  },
  {
    'data-test-subj': 'doc_count',
    dataType: 'number',
    field: 'doc_count',
    name: i18n.COUNT_TABLE_COLUMN_TITLE,
    render: (item: string) => numeral(item).format(defaultNumberFormat),
    sortable: true,
    textOnly: true,
  },
];

export const getMultiGroupAlertsCountTableColumns = ({
  defaultNumberFormat,
  stackByField0,
  stackByField1,
}: {
  defaultNumberFormat: string;
  stackByField0: string;
  stackByField1: string | undefined;
}): Array<EuiBasicTableColumn<FlattenedBucket>> => [
  {
    'data-test-subj': 'stackByField0Key',
    field: 'key',
    name: i18n.COLUMN_LABEL({ fieldName: stackByField0, topN: DEFAULT_STACK_BY_FIELD0_SIZE }),
    render: function DraggableStackOptionField(value: string) {
      return (
        <DefaultDraggable
          isDraggable={false}
          field={stackByField0}
          hideTopN={true}
          id={`alert-count-draggable-stackByField0-${stackByField0}-${stackByField1}-${value}`}
          value={value}
          tooltipContent={null}
        />
      );
    },
    truncateText: false,
  },
  {
    'data-test-subj': 'stackByField1Key',
    field: 'stackByField1Key',
    name: i18n.COLUMN_LABEL({ fieldName: stackByField1 ?? '', topN: DEFAULT_STACK_BY_FIELD1_SIZE }),
    render: function DraggableStackOptionField(value: string) {
      return (
        <DefaultDraggable
          isDraggable={false}
          field={stackByField1 ?? ''}
          hideTopN={true}
          id={`alert-count-draggable-stackByField1-${stackByField0}-${stackByField1}-${value}`}
          value={value}
          tooltipContent={null}
        />
      );
    },
    truncateText: false,
  },
  {
    'data-test-subj': 'stackByField1DocCount',
    dataType: 'number',
    field: 'stackByField1DocCount',
    name: i18n.COUNT_TABLE_COLUMN_TITLE,
    render: (item: string) => numeral(item).format(defaultNumberFormat),
    sortable: true,
    textOnly: true,
  },
];
