/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { i18n } from '@kbn/i18n';
import type { EventFormOption } from '../event_collection_card';
import { EventCollectionCard } from '../event_collection_card';
import type { PolicyFormComponentCommonProps } from '../../types';

const OPTIONS: ReadonlyArray<EventFormOption<OperatingSystem.MAC>> = [
  {
    name: i18n.translate('xpack.securitySolution.endpoint.policyDetailsConfig.mac.events.file', {
      defaultMessage: 'File',
    }),
    protectionField: 'file',
  },
  {
    name: i18n.translate('xpack.securitySolution.endpoint.policyDetailsConfig.mac.events.process', {
      defaultMessage: 'Process',
    }),
    protectionField: 'process',
  },
  {
    name: i18n.translate('xpack.securitySolution.endpoint.policyDetailsConfig.mac.events.network', {
      defaultMessage: 'Network',
    }),
    protectionField: 'network',
  },
];

export type MacEventCollectionCardProps = PolicyFormComponentCommonProps;

export const MacEventCollectionCard = memo<MacEventCollectionCardProps>((props) => {
  return (
    <EventCollectionCard<OperatingSystem.MAC>
      {...props}
      os={OperatingSystem.MAC}
      selection={props.policy.mac.events}
      options={OPTIONS}
    />
  );
});
MacEventCollectionCard.displayName = 'MacEventCollectionCard';
