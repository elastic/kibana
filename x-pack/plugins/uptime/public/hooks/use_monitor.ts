/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useParams } from 'react-router-dom';

export const useMonitorId = (): string => {
  const { monitorId } = useParams<{ monitorId: string }>();

  // decode 64 base string, it was decoded to make it a valid url, since monitor id can be a url
  return atob(monitorId || '');
};
