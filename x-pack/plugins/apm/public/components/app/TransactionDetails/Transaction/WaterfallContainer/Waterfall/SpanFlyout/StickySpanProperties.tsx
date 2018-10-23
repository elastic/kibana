/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// tslint:disable-next-line  no-var-requires
const numeral = require('@elastic/numeral');
import React from 'react';

import { first } from 'lodash';
import { Span } from '../../../../../../../../typings/Span';
// @ts-ignore
import { asMillis } from '../../../../../../../utils/formatters';
// @ts-ignore
import { StickyProperties } from '../../../../../../shared/StickyProperties';

function getSpanLabel(type: string) {
  switch (type) {
    case 'db':
      return 'DB';
    case 'hard-navigation':
      return 'Navigation timing';
    default:
      return type;
  }
}

function getPrimaryType(type: string) {
  return first(type.split('.'));
}

interface Props {
  span: Span;
  totalDuration: number;
}

export function StickySpanProperties({ span, totalDuration }: Props) {
  const spanName = span.span.name;
  const spanDuration = span.span.duration.us;
  const relativeDuration = spanDuration / totalDuration;
  const spanTypeLabel = getSpanLabel(getPrimaryType(span.span.type));

  const stickyProperties = [
    {
      label: 'Name',
      fieldName: 'span.name',
      val: spanName || 'N/A'
    },
    {
      fieldName: 'span.type',
      label: 'Type',
      val: spanTypeLabel
    },
    {
      fieldName: 'span.duration.us',
      label: 'Duration',
      val: asMillis(spanDuration)
    },
    {
      label: '% of transaction',
      val: numeral(relativeDuration).format('0.00%')
    }
  ];

  return <StickyProperties stickyProperties={stickyProperties} />;
}
