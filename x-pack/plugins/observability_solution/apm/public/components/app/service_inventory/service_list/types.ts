/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceListItem } from '../../../../../common/service_inventory';

export type InteractiveServiceListItem = ServiceListItem & {
  serviceLink: React.ReactElement;
  alerts: {
    href: string;
    onClick?: React.MouseEventHandler<HTMLElement>;
  };
};
