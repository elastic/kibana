/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  AlertConsumers,
  ALERT_CASE_IDS,
  ALERT_STATUS,
  ALERT_MAINTENANCE_WINDOW_IDS,
} from '@kbn/rule-data-utils';
import { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { Alert, AlertsTableProps } from '../../../types';

export interface Consumer {
  id: AlertConsumers;
  name: string;
}

export type ServerError = IHttpFetchError<ResponseErrorBody>;

export interface CellComponentProps {
  alert: Alert;
  cases: AlertsTableProps['cases']['data'];
  maintenanceWindows: AlertsTableProps['maintenanceWindows']['data'];
  columnId: SystemCellId;
  isLoading: boolean;
  showAlertStatusWithFlapping: boolean;
}

export type CellComponent = React.FC<CellComponentProps>;

export interface SystemCellComponentMap {
  [ALERT_STATUS]: CellComponent;
  [ALERT_CASE_IDS]: CellComponent;
  [ALERT_MAINTENANCE_WINDOW_IDS]: CellComponent;
}

export type SystemCellId = keyof SystemCellComponentMap;

type UseCasesAddToNewCaseFlyout = (props?: Record<string, unknown>) => {
  open: ({ attachments }: { attachments: any[] }) => void;
  close: () => void;
};

type UseCasesAddToExistingCaseModal = (props?: Record<string, unknown>) => {
  open: ({
    getAttachments,
  }: {
    getAttachments: ({ theCase }: { theCase?: { id: string } }) => any[];
  }) => void;
  close: () => void;
};

export interface CasesService {
  ui: {
    getCasesContext: () => React.FC<any>;
  };
  hooks: {
    useCasesAddToNewCaseFlyout: UseCasesAddToNewCaseFlyout;
    useCasesAddToExistingCaseModal: UseCasesAddToExistingCaseModal;
  };
  helpers: {
    groupAlertsByRule: (items?: any[]) => any[];
    canUseCases: (owners: string[]) => Record<string, unknown>;
  };
}
