/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

export function SvlCustomRolesPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');

  return {
    // Create role button
    async assertCreateRoleButtonExists() {
      await testSubjects.existOrFail('createRoleButton');
    },
    async assertCreateRoleButtonDoesNotExist() {
      await testSubjects.missingOrFail('createRoleButton');
    },
    async clickCreateRoleButton() {
      await testSubjects.click('createRoleButton');
    },

    // Add Kibana privileges button
    async assertAddKibanaPrivilegesButtonExists() {
      await testSubjects.existOrFail('addSpacePrivilegeButton');
    },
    async assertAddKibanaPrivilegesButtonDoesNotExist() {
      await testSubjects.missingOrFail('addSpacePrivilegeButton');
    },
    async clickAddKibanaPrivilegesButton() {
      await testSubjects.click('addSpacePrivilegeButton');
    },

    // Set space as default
    async assertSetSpaceDropdownExists() {
      await testSubjects.existOrFail('spaceSelectorComboBox');
    },
    async assertSetSpaceDropdownDoesNotExist() {
      await testSubjects.missingOrFail('spaceSelectorComboBox');
    },
    async clickSetSpaceDropdown() {
      await testSubjects.click('spaceSelectorComboBox');
    },
    async setSpaceDropdown(spaceName: string) {
      await testSubjects.click('spaceSelectorComboBox');
      await comboBox.setCustom('spaceSelectorComboBox', spaceName);
    },

    // toggle Observability privileges
    async assertFeatureCategoryObservabilityExists() {
      await testSubjects.existOrFail('featureCategory_observability');
    },
    async assertFeatureCategoryObservabilityDoesNotExist() {
      await testSubjects.missingOrFail('featureCategory_observability');
    },
    async toggleObservabilityPrivilegeCategory() {
      await testSubjects.click('featureCategory_observability_accordionToggle');
    },

    // toggle Analytics privileges
    async assertFeatureCategoryAnalyticsExists() {
      await testSubjects.existOrFail('featureCategoryButton_kibana');
    },
    async assertFeatureCategoryAnalyticsDoesNotExist() {
      await testSubjects.missingOrFail('featureCategoryButton_kibana');
    },
    async toggleAnalyticsPrivilegeCategory() {
      await testSubjects.click('featureCategoryButton_kibana_accordionToggle');
    },
  };
}
