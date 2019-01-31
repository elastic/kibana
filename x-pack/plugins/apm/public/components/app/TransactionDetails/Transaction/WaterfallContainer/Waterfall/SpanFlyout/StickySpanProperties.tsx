/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { first } from 'lodash';
import React from 'react';
import {
  SPAN_DURATION,
  SPAN_NAME,
  SPAN_TYPE
} from 'x-pack/plugins/apm/common/constants';
import { NOT_AVAILABLE_LABEL } from 'x-pack/plugins/apm/common/i18n';
import { Span } from '../../../../../../../../typings/es_schemas/Span';
import { asMillis, asPercent } from '../../../../../../../utils/formatters';
import { StickyProperties } from '../../../../../../shared/StickyProperties';

function getSpanLabel(type: string) {
  switch (type) {
    case 'db':
      return 'DB';
    case 'hard-navigation':
      return i18n.translate(
        'xpack.apm.transactionDetails.spanFlyout.spanType.navigationTimingLabel',
        {
          defaultMessage: 'Navigation timing'
        }
      );
    default:
      return type;
  }
}

function getPrimaryType(type: string) {
  return first(type.split('.'));
}

interface Props {
  span: Span;
  totalDuration?: number;
}

export function StickySpanProperties({ span, totalDuration }: Props) {
  if (!totalDuration) {
    return null;
  }

  const spanName = span.span.name;
  const spanDuration = span.span.duration.us;
  const spanTypeLabel = getSpanLabel(getPrimaryType(span.span.type));
  const stickyProperties = [
    {
      label: i18n.translate(
        'xpack.apm.transactionDetails.spanFlyout.nameLabel',
        {
          defaultMessage: 'Name'
        }
      ),
      fieldName: SPAN_NAME,
      val: spanName || NOT_AVAILABLE_LABEL,
      truncated: true,
      width: '50%'
    },
    {
      fieldName: SPAN_TYPE,
      label: i18n.translate(
        'xpack.apm.transactionDetails.spanFlyout.typeLabel',
        {
          defaultMessage: 'Type'
        }
      ),
      val: spanTypeLabel,
      truncated: true,
      width: '50%'
    },
    {
      fieldName: SPAN_DURATION,
      label: i18n.translate(
        'xpack.apm.transactionDetails.spanFlyout.durationLabel',
        {
          defaultMessage: 'Duration'
        }
      ),
      val: asMillis(spanDuration),
      width: '50%'
    },
    {
      label: i18n.translate(
        'xpack.apm.transactionDetails.spanFlyout.percentOfTransactionLabel',
        {
          defaultMessage: '% of transaction'
        }
      ),
      val: asPercent(spanDuration, totalDuration),
      width: '50%'
    }
  ];

  return <StickyProperties stickyProperties={stickyProperties} />;
}
