/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum EQLToken {
  Sequence = 'eql.sequence',
  SequenceItemStart = 'eql.sequence_item_start',
  SequenceItemEnd = 'eql.sequence_item_end',
  Until = 'eql.until',
  Field = 'eql.field',
  EventType = 'eql.event_type',
  Where = 'eql.where',
  BoolCondition = 'eql.bool_condition',
  Operator = 'eql.operator',
  Value = 'eql.value',
  LogicalOperator = 'eql.logical_operator',
  InOperator = 'eql.in_operator',
  ValueListStart = 'eql.value_list_start',
  ValueListItem = 'eql.value_list_item',
  ValueListEnd = 'eql.value_list_end',
  Comma = 'eql.comma',
}
