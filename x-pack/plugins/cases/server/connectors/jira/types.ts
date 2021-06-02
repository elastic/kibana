/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JiraFieldsType } from '../../../common/api';
import { CaseConnector } from '../types';

interface ExternalServiceFormatterParams extends JiraFieldsType {
  labels: string[];
}

export type JiraCaseConnector = CaseConnector<ExternalServiceFormatterParams>;
export type Format = CaseConnector<ExternalServiceFormatterParams>['format'];
export type GetMapping = CaseConnector<ExternalServiceFormatterParams>['getMapping'];
