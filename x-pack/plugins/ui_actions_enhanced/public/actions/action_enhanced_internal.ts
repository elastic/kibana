/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ActionEnhanced, ActionEnhancedContext, ActionEnhancedDefinition } from './action_enhanced';
import { ActionInternal } from '../../../../../src/plugins/ui_actions/public';
import { ILicense } from '../../../licensing/public';

export class ActionEnhancedInternal<A extends ActionEnhancedDefinition = ActionEnhancedDefinition>
  extends ActionInternal
  implements ActionEnhanced<ActionEnhancedContext<A>> {
  readonly minimalLicense = this.definition.minimalLicense;
  constructor(public readonly definition: A, protected getLicenseInfo: () => ILicense) {
    super(definition);
  }

  isCompatibleLicence() {
    if (!this.minimalLicense) return true;
    return this.getLicenseInfo().hasAtLeast(this.minimalLicense);
  }

  async isCompatible(context: ActionEnhancedContext<A>): Promise<boolean> {
    if (!this.isCompatibleLicence()) return false;
    return super.isCompatible(context);
  }
}
