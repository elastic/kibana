/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MutableRefObject } from 'react';
import { Ecs, CaseViewRefreshPropInterface } from '../../../common/ui/types';
import { CasesNavigation } from '../links';
import { CasesTimelineIntegration } from '../timeline_context';

export interface CasesRoutesProps {
  onComponentInitialized?: () => void;
  actionsNavigation?: CasesNavigation<string, 'configurable'>;
  ruleDetailsNavigation?: CasesNavigation<string | null | undefined, 'configurable'>;
  showAlertDetails?: (alertId: string, index: string) => void;
  useFetchAlertData: (alertIds: string[]) => [boolean, Record<string, Ecs>];
  /**
   * A React `Ref` that Exposes data refresh callbacks.
   * **NOTE**: Do not hold on to the `.current` object, as it could become stale
   */
  refreshRef?: MutableRefObject<CaseViewRefreshPropInterface>;
  timelineIntegration?: CasesTimelineIntegration;
}
