/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ServiceGroupsTour } from '../service_groups_tour';
import { useServiceGroupsTour } from '../use_service_groups_tour';

interface Props {
  onClick: () => void;
}

export function EditButton({ onClick }: Props) {
  const { tourEnabled, dismissTour } = useServiceGroupsTour('editGroup');
  return (
    <ServiceGroupsTour
      tourEnabled={tourEnabled}
      dismissTour={dismissTour}
      title={i18n.translate('xpack.apm.serviceGroups.tour.editGroups.title', {
        defaultMessage: 'Edit this service group',
      })}
      content={i18n.translate(
        'xpack.apm.serviceGroups.tour.editGroups.content',
        {
          defaultMessage:
            'Use the edit option to change the name, query, or details of this service group.',
        }
      )}
    >
      <EuiButton
        iconType="pencil"
        onClick={() => {
          dismissTour();
          onClick();
        }}
      >
        {i18n.translate('xpack.apm.serviceGroups.editGroupLabel', {
          defaultMessage: 'Edit group',
        })}
      </EuiButton>
    </ServiceGroupsTour>
  );
}
