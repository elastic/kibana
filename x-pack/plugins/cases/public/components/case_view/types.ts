/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MutableRefObject } from 'react';
import { CasesTimelineIntegration } from '../timeline_context';
import { CasesNavigation } from '../links';
import { CaseViewRefreshPropInterface, Case } from '../../../common';
import { UseGetCase } from '../../containers/use_get_case';
import { UseFetchAlertData } from '../../../common/ui';

export interface CaseViewBaseProps {
  onComponentInitialized?: () => void;
  actionsNavigation?: CasesNavigation<string, 'configurable'>;
  ruleDetailsNavigation?: CasesNavigation<string | null | undefined, 'configurable'>;
  showAlertDetails?: (alertId: string, index: string) => void;
  useFetchAlertData: UseFetchAlertData;
  /**
   * A React `Ref` that Exposes data refresh callbacks.
   * **NOTE**: Do not hold on to the `.current` object, as it could become stale
   */
  refreshRef?: MutableRefObject<CaseViewRefreshPropInterface>;
}

export interface CaseViewProps extends CaseViewBaseProps {
  timelineIntegration?: CasesTimelineIntegration;
}

export interface CaseViewPageProps extends CaseViewBaseProps {
  caseId: string;
  fetchCase: UseGetCase['fetchCase'];
  caseData: Case;
  updateCase: (newCase: Case) => void;
}

export interface OnUpdateFields {
  key: keyof Case;
  value: Case[keyof Case];
  onSuccess?: () => void;
  onError?: () => void;
}
