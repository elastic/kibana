/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import 'brace/ext/language_tools';
import { acequire } from 'brace';
import { EQLToken } from './tokens';

const TextHighlightRules = acequire(
  'ace/mode/text_highlight_rules'
).TextHighlightRules;

export class EQLHighlightRules extends TextHighlightRules {
  constructor() {
    super();

    const fieldNameOrValueRegex = /((?:[^\s]+)|(?:".*?"))/;
    const operatorRegex = /(:|==|>|>=|<|<=|!=)/;

    const sequenceItemEnd = {
      token: EQLToken.SequenceItemEnd,
      regex: /(\])/,
      next: 'start',
    };

    this.$rules = {
      start: [
        {
          token: EQLToken.Sequence,
          regex: /(sequence by)/,
          next: 'field',
        },
        {
          token: EQLToken.SequenceItemStart,
          regex: /(\[)/,
          next: 'sequence_item',
        },
        {
          token: EQLToken.Until,
          regex: /(until)/,
          next: 'start',
        },
      ],
      field: [
        {
          token: EQLToken.Field,
          regex: fieldNameOrValueRegex,
          next: 'start',
        },
      ],
      sequence_item: [
        {
          token: EQLToken.EventType,
          regex: fieldNameOrValueRegex,
          next: 'where',
        },
      ],
      sequence_item_end: [sequenceItemEnd],
      where: [
        {
          token: EQLToken.Where,
          regex: /(where)/,
          next: 'condition',
        },
      ],
      condition: [
        {
          token: EQLToken.BoolCondition,
          regex: /(true|false)/,
          next: 'sequence_item_end',
        },
        {
          token: EQLToken.Field,
          regex: fieldNameOrValueRegex,
          next: 'comparison_operator',
        },
      ],
      comparison_operator: [
        {
          token: EQLToken.Operator,
          regex: operatorRegex,
          next: 'value_or_value_list',
        },
      ],
      value_or_value_list: [
        {
          token: EQLToken.Value,
          regex: /("([^"]+)")|([\d+\.]+)|(true|false|null)/,
          next: 'logical_operator_or_sequence_item_end',
        },
        {
          token: EQLToken.InOperator,
          regex: /(in)/,
          next: 'value_list',
        },
      ],
      logical_operator_or_sequence_item_end: [
        {
          token: EQLToken.LogicalOperator,
          regex: /(and|or|not)/,
          next: 'condition',
        },
        sequenceItemEnd,
      ],
      value_list: [
        {
          token: EQLToken.ValueListStart,
          regex: /(\()/,
          next: 'value_list_item',
        },
      ],
      value_list_item: [
        {
          token: EQLToken.Value,
          regex: fieldNameOrValueRegex,
          next: 'comma',
        },
      ],
      comma: [
        {
          token: EQLToken.Comma,
          regex: /,/,
          next: 'value_list_item_or_end',
        },
      ],
      value_list_item_or_end: [
        {
          token: EQLToken.Value,
          regex: fieldNameOrValueRegex,
          next: 'comma',
        },
        {
          token: EQLToken.ValueListEnd,
          regex: /\)/,
          next: 'logical_operator_or_sequence_item_end',
        },
      ],
    };

    this.normalizeRules();
  }
}
