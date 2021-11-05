/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { SharePluginSetup, SharePluginStart, LocatorPublic } from 'src/plugins/share/public';

export { AppNavLinkStatus } from '../../../../src/core/public';

export type { UseRequestResponse } from '../../../../src/plugins/es_ui_shared/public';
export { useRequest } from '../../../../src/plugins/es_ui_shared/public';

export { KibanaContextProvider } from '../../../../src/plugins/kibana_react/public';

import { useKibana as _useKibana } from '../../../../src/plugins/kibana_react/public';
import type { KibanaContext } from './types';
export const useKibana = () => _useKibana<KibanaContext>();

export type { SerializableRecord } from '@kbn/utility-types';

export type { UiActionsSetup, UiActionsStart } from 'src/plugins/ui_actions/public';

export type { ManagementAppMountParams } from 'src/plugins/management/public';

export type { LicenseCheck } from '../../licensing/public';
