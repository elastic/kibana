/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { selectOverviewState } from '../../../state';

export const useCanUsePublicLocById = (configId: string) => {
  const {
    data: { monitors },
  } = useSelector(selectOverviewState);

  const hasManagedLocation = monitors?.filter(
    (mon) => mon.configId === configId && mon.location.isServiceManaged
  );

  const canUsePublicLocations =
    useKibana().services?.application?.capabilities.uptime.elasticManagedLocationsEnabled ?? true;

  return hasManagedLocation ? !!canUsePublicLocations : true;
};
