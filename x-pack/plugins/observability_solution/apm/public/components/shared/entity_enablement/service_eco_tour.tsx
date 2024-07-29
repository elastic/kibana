/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiTourStep } from '@elastic/eui';
import { useServiceEcoTour } from '../../../hooks/use_eco_tour';

export function ServiceEcoTour({
  children,
  onFinish,
}: {
  children: React.ReactElement;
  onFinish: () => void;
}) {
  const { tourState } = useServiceEcoTour();

  return (
    <EuiTourStep
      content={
        <EuiText>
          <p>
            {i18n.translate('xpack.apm.serviceEcoTour.content', {
              defaultMessage: 'You can now add services from logs to the service inventory',
            })}
          </p>
        </EuiText>
      }
      isStepOpen={tourState.isTourActive}
      minWidth={200}
      onFinish={onFinish}
      step={1}
      stepsTotal={1}
      title={i18n.translate('xpack.apm.serviceEcoTour.title', {
        defaultMessage: 'Add services from logs',
      })}
      subtitle={i18n.translate('xpack.apm.serviceEcoTour.subtitle', {
        defaultMessage: 'New Services Inventory',
      })}
      anchorPosition="rightUp"
    >
      {children}
    </EuiTourStep>
  );
}
