/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useState } from 'react';

import type { GetOutputHealthResponse } from '../../../../../../../common/types';

import { sendGetOutputHealth, useStartServices } from '../../../../hooks';
import type { Output } from '../../../../types';

interface Props {
  output: Output;
}
const REFRESH_INTERVAL_MS = 5000;

export const OutputHealth: React.FunctionComponent<Props> = ({ output }) => {
  const { notifications } = useStartServices();
  const [outputHealth, setOutputHealth] = useState<GetOutputHealthResponse | null>();
  const fetchData = useCallback(async () => {
    try {
      const response = await sendGetOutputHealth(output.id);
      if (response.error) {
        throw response.error;
      }
      setOutputHealth(response.data);
    } catch (error) {
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.fleet.output.errorFetchingOutputHealth', {
          defaultMessage: 'Error fetching output state',
        }),
      });
    }
  }, [output.id, notifications.toasts]);

  // Send request to get output health
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchData]);

  return outputHealth?.state === 'DEGRADED' ? (
    <EuiCallOut title="Error" color="danger" iconType="error">
      <p>
        {i18n.translate('xpack.fleet.output.calloutText', {
          defaultMessage: 'Unable to connect to "{name}" at {host}.',
          values: {
            name: output.name,
            host: output.hosts?.join(',') ?? '',
          },
        })}
      </p>{' '}
      <p>
        {i18n.translate('xpack.fleet.output.calloutPromptText', {
          defaultMessage: 'Please check the details are correct.',
        })}
      </p>
    </EuiCallOut>
  ) : null;
};
