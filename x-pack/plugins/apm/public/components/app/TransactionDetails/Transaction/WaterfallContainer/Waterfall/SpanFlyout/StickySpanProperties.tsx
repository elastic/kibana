/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  SPAN_ACTION,
  SPAN_DURATION,
  SPAN_NAME,
  SPAN_SUBTYPE,
  SPAN_TYPE
} from 'x-pack/plugins/apm/common/elasticsearch_fieldnames';
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
    case 'mysql':
      return 'MySQL';
    case 'query':
      return i18n.translate(
        'xpack.apm.transactionDetails.spanFlyout.spanType.action.query',
        {
          defaultMessage: 'Query'
        }
      );
    default:
      return type;
  }
}

function getSpanTypes(span: Span) {
  const { type, subtype, action } = span.span;

  const [primaryType, subtypeFromType, actionFromType] = type.split('.');

  return {
    type: primaryType,
    subtype: subtype || subtypeFromType,
    action: action || actionFromType
  };
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
  const { type, subtype, action } = getSpanTypes(span);
  const spanTypeLabel = getSpanLabel(type);
  const spanSubtypeLabel = getSpanLabel(subtype);
  const spanActionLabel = getSpanLabel(action);
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
      width: '15%'
    }
  ];

  if (spanSubtypeLabel) {
    stickyProperties.push({
      fieldName: SPAN_SUBTYPE,
      label: i18n.translate(
        'xpack.apm.transactionDetails.spanFlyout.subtypeLabel',
        {
          defaultMessage: 'Subtype'
        }
      ),
      val: spanSubtypeLabel,
      truncated: true,
      width: '15%'
    });
  }

  if (spanActionLabel) {
    stickyProperties.push({
      fieldName: SPAN_ACTION,
      label: i18n.translate(
        'xpack.apm.transactionDetails.spanFlyout.actionLabel',
        {
          defaultMessage: 'Action'
        }
      ),
      val: spanActionLabel,
      truncated: true,
      width: '15%'
    });
  }

  return <StickyProperties stickyProperties={stickyProperties} />;
}
