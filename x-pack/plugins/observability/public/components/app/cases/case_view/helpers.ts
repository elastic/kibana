/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEmpty } from 'lodash';
import { useEffect, useState } from 'react';
import type { Ecs } from '../../../../../../cases/common/ui/types';
import { usePluginContext } from '../../../../hooks/use_plugin_context';
import type { TopAlert } from '../../../../pages/alerts';
import { parseAlert } from '../../../../pages/alerts/parse_alert';
import { useKibana } from '../../../../utils/kibana_react';

// no alerts in observability so far
// dummy hook for now as hooks cannot be called conditionally
export const useFetchAlertData = (): [boolean, Record<string, Ecs>] => [false, {}];

export const useFetchAlertDetail = (alertId: string): [boolean, TopAlert | null] => {
  const { http } = useKibana().services;
  const [loading, setLoading] = useState(false);
  const { observabilityRuleTypeRegistry } = usePluginContext();
  const [alert, setAlert] = useState<TopAlert | null>(null);

  useEffect(() => {
    const abortCtrl = new AbortController();
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await http.get('/internal/rac/alerts', {
          query: {
            id: alertId,
          },
        });
        if (response) {
          const parsedAlert = parseAlert(observabilityRuleTypeRegistry)(response);
          setAlert(parsedAlert);
          setLoading(false);
        }
      } catch (error) {
        setAlert(null);
      }
    };

    if (!isEmpty(alertId) && loading === false && alert === null) {
      fetchData();
    }
    return () => {
      abortCtrl.abort();
    };
  }, [http, alertId, alert, loading, observabilityRuleTypeRegistry]);

  return [loading, alert];
};
