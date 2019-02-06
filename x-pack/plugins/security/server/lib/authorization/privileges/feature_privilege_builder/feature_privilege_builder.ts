/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Feature,
  FeatureKibanaPrivileges,
} from 'x-pack/plugins/xpack_main/server/lib/feature_registry/feature_registry';
import { Actions } from '../../actions';

export abstract class FeaturePrivilegeBuilder {
  constructor(protected readonly actions: Actions) {}

  public abstract getActions(
    privilegeDefinition: FeatureKibanaPrivileges,
    feature: Feature
  ): string[];
}
