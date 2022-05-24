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

export function CreateButton({ onClick }: Props) {
  const { tourEnabled, dismissTour } = useServiceGroupsTour('createGroup');
  return (
    <ServiceGroupsTour
      tourEnabled={tourEnabled}
      dismissTour={dismissTour}
      title={i18n.translate('xpack.apm.serviceGroups.tour.createGroups.title', {
        defaultMessage: 'Introducing service groups',
      })}
      content={i18n.translate(
        'xpack.apm.serviceGroups.tour.createGroups.content',
        {
          defaultMessage:
            'Group services together to build curated inventory views that remove noise and simplify investigations across services. Groups are Kibana space-specific and available for any users with appropriate access.',
        }
      )}
    >
      <EuiButton
        iconType="plusInCircle"
        onClick={() => {
          dismissTour();
          onClick();
        }}
      >
        {i18n.translate('xpack.apm.serviceGroups.createGroupLabel', {
          defaultMessage: 'Create group',
        })}
      </EuiButton>
    </ServiceGroupsTour>
  );
}
