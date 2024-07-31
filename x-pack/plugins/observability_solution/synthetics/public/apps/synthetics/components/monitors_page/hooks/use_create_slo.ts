/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useState } from 'react';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';
import { ClientPluginsStart } from '../../../../../plugin';

export function useCreateSLO({
  configId,
  label,
  tags,
}: {
  configId: string;
  label: string;
  tags: string[];
}) {
  const { slo } = useKibana<ClientPluginsStart>().services;

  const [isSLOFlyoutOpen, setIsSLOFlyoutOpen] = useState(false);

  const CreateSLOFlyout = slo?.getCreateSLOFlyout({
    initialValues: {
      name: `SLO for monitor ${label}`,
      indicator: {
        type: 'sli.synthetics.availability',
        params: {
          index: SYNTHETICS_INDEX_PATTERN,
          filter: '',
          monitorIds: [
            {
              value: configId,
              label,
            },
          ],
          projects: [],
          tags: [],
        },
      },
      budgetingMethod: 'occurrences',
      objective: {
        target: 0.99,
      },
      tags: tags || [],
      groupBy: ['monitor.name', 'observer.geo.name', 'monitor.id'],
    },
    onClose: () => {
      setIsSLOFlyoutOpen(false);
    },
  });

  return {
    CreateSLOFlyout: isSLOFlyoutOpen ? CreateSLOFlyout : null,
    setIsSLOFlyoutOpen,
  };
}
