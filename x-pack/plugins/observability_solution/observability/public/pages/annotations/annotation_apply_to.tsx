/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import React from 'react';
import { ALL_VALUE } from '@kbn/slo-schema';
import { Annotation } from '../../../common/annotations';

export function AnnotationApplyTo({ annotation }: { annotation: Annotation }) {
  const slo = annotation.slo;
  const serviceName = annotation.service?.name;
  let sloLabel = slo
    ? i18n.translate('xpack.observability.columns.sloTextLabel', {
        defaultMessage: 'SLO: {slo}',
        values: { slo: slo.id },
      })
    : '';
  const isAllSlos = slo?.id === ALL_VALUE;
  if (isAllSlos) {
    sloLabel = i18n.translate('xpack.observability.columns.sloTextLabel.all', {
      defaultMessage: 'SLOs: All',
    });
  }
  const serviceLabel = serviceName
    ? i18n.translate('xpack.observability.columns.serviceLabel', {
        defaultMessage: 'Service: {serviceName}',
        values: { serviceName },
      })
    : '';

  if (!slo && !serviceName) {
    return (
      <EuiText size="s">
        {i18n.translate('xpack.observability.columns.TextLabel', { defaultMessage: '--' })}
      </EuiText>
    );
  }

  return (
    <EuiText size="s">
      {serviceLabel}
      {sloLabel}
    </EuiText>
  );
}
