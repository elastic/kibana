/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useMonitorList } from '../components/monitors_page/hooks/use_monitor_list';

export const useMonitorName = ({ search = '' }: { search?: string }) => {
  const { monitorId } = useParams<{ monitorId: string }>();

  const { syntheticsMonitors, loading } = useMonitorList(search);

  return useMemo(() => {
    const nameAlreadyExists = Boolean(
      syntheticsMonitors?.some(
        (monitor) => monitor.name.trim().toLowerCase() === search && monitorId !== monitor.config_id
      )
    );

    const values = syntheticsMonitors.map((monitor) => ({
      label: monitor.name as string,
      key: monitor.config_id,
      locationIds: monitor.locations.map((location) => location.id),
    }));

    return {
      loading,
      nameAlreadyExists,
      validName: nameAlreadyExists ? '' : search,
      values: values.filter((val) => val.key !== monitorId),
    };
  }, [loading, monitorId, syntheticsMonitors, search]);
};
