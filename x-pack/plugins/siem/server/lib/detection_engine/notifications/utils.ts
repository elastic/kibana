/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const getNotificationResultsLink = ({
  kibanaSiemAppUrl = '/app/siem',
  id,
  from,
  to,
}: {
  kibanaSiemAppUrl?: string;
  id: string;
  from?: string;
  to?: string;
}) => {
  if (from == null || to == null) return '';

  return `${kibanaSiemAppUrl}#/detections/rules/id/${id}?timerange=(global:(linkTo:!(timeline),timerange:(from:${from},kind:absolute,to:${to})),timeline:(linkTo:!(global),timerange:(from:${from},kind:absolute,to:${to})))`;
};
