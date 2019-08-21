/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';
import { TypeOf } from '@kbn/config-schema';
import { schema } from './schema';
import { LICENSE_TYPE } from './constants';
import { LicensingPluginSetup } from './licensing_plugin_setup';

/** @public */
export type LicensingPluginSubject = BehaviorSubject<LicensingPluginSetup>;
/** @public */
export type LicensingConfigType = TypeOf<typeof schema>;
/** @public */
export type LicenseType = keyof typeof LICENSE_TYPE;
/** @public */
export type LicenseFeatureSerializer = (licensing: LicensingPluginSetup) => any;
