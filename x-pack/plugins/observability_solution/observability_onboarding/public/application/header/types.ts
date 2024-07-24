/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import type { SupportedLogo } from '../shared/logo_icon';

export type SupportedPath = '/kubernetes' | '/otel-logs' | '/auto-detect';

export interface CustomHeaderSection {
  logo?: SupportedLogo;
  euiIconType?: EuiIconType;
  headlineCopy: string;
  captionCopy: string;
}
