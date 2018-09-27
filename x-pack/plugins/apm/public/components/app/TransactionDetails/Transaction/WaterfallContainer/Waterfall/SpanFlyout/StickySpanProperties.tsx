/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// tslint:disable-next-line  no-var-requires
const numeral = require('@elastic/numeral');
import React from 'react';
import styled from 'styled-components';

// @ts-ignore
import { Span } from '../../../../../../../../typings/Span';
import { units } from '../../../../../../../style/variables';
// @ts-ignore
import { asMillis } from '../../../../../../../utils/formatters';
// @ts-ignore
import { Indicator } from '../../../../../../shared/charts/Legend';
// @ts-ignore
import { StickyProperties } from '../../../../../../shared/StickyProperties';

const LegendIndicator = styled(Indicator)`
  display: inline-block;
`;

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

interface Props {
  span: Span;
  totalDuration: number;
}

export function StickySpanProperties({ span, totalDuration }: Props) {
  const spanName = span.span.name;
  const spanDuration = span.span.duration.us;
  const relativeDuration = spanDuration / totalDuration;
  const spanTypeLabel = getSpanLabel(span.span.type);
  const spanTypeColor = 'red'; // TODO

  const stickyProperties = [
    {
      label: 'Name',
      fieldName: 'span.name',
      val: spanName || 'N/A'
    },
    {
      fieldName: 'span.type',
      label: 'Type',
      val: (
        <div>
          <LegendIndicator radius={units.minus - 1} color={spanTypeColor} />
          {spanTypeLabel}
        </div>
      )
    },
    {
      fieldName: 'span.duration.us',
      label: 'Duration',
      val: asMillis(spanDuration)
    },
    {
      label: '% of total time',
      val: numeral(relativeDuration).format('0.00%')
    }
  ];

  return <StickyProperties stickyProperties={stickyProperties} />;
}
