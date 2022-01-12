/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { StatusAllType } from '../../../common/ui/types';
import { CaseStatuses } from '../../../common/api';

export type AllCaseStatus = Record<StatusAllType, { color: string; label: string }>;

export type Statuses = Record<
  CaseStatuses,
  {
    color: string;
    label: string;
    icon: EuiIconType;
    actions: {
      bulk: {
        title: string;
      };
      single: {
        title: string;
        description?: string;
      };
    };
    actionBar: {
      title: string;
    };
    button: {
      label: string;
    };
    stats: {
      title: string;
    };
  }
>;
