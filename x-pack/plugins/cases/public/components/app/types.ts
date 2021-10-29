/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MutableRefObject } from 'react';
import { Ecs, Case, CaseViewRefreshPropInterface } from '../../../common';
import { CasesNavigation } from '../links';
import { CasesTimelineIntegration } from '../timeline_context';

export interface CasesRoutesProps {
  // caseDetailsNavigation: CasesNavigation<CaseDetailsHrefSchema, 'configurable'>; // if not passed, case name is not displayed as a link (Formerly dependant on isSelector)
  // configureCasesNavigation: CasesNavigation; // if not passed, header with nav is not displayed (Formerly dependant on isSelector)
  // createCaseNavigation: CasesNavigation;
  path: string;
  appId: string;
  disableAlerts?: boolean;
  showTitle?: boolean;
  onComponentInitialized?: () => void;
  actionsNavigation?: CasesNavigation<string, 'configurable'>;
  ruleDetailsNavigation?: CasesNavigation<string | null | undefined, 'configurable'>;
  showAlertDetails?: (alertId: string, index: string) => void;
  subCaseId?: string;
  useFetchAlertData: (alertIds: string[]) => [boolean, Record<string, Ecs>];
  userCanCrud: boolean;
  /**
   * A React `Ref` that Exposes data refresh callbacks.
   * **NOTE**: Do not hold on to the `.current` object, as it could become stale
   */
  refreshRef?: MutableRefObject<CaseViewRefreshPropInterface>;
  hideSyncAlerts?: boolean;
  onCaseDataSuccess?: (data: Case) => void;
  timelineIntegration?: CasesTimelineIntegration;
}
