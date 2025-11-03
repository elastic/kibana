/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pageObjects as platformFunctionalPageObjects } from '../../../functional/page_objects';

import { SvlCommonPageProvider } from './svl_common_page';
import { SvlCommonNavigationProvider } from './svl_common_navigation';
import { SvlTriggersActionsPageProvider } from './svl_triggers_actions_ui_page';
import { SvlRuleDetailsPageProvider } from './svl_rule_details_ui_page';
import { SvlManagementPageProvider } from './svl_management_page';
import { SvlIngestPipelines } from './svl_ingest_pipelines';
import { SvlApiKeysProvider } from './svl_api_keys';
import { SvlDataUsagePageProvider } from './svl_data_usage';
import { SvlCustomRolesPageProvider } from './svl_custom_roles_page';

export const pageObjects = {
  ...platformFunctionalPageObjects,
  svlCommonPage: SvlCommonPageProvider,
  svlCommonNavigation: SvlCommonNavigationProvider,
  svlTriggersActionsUI: SvlTriggersActionsPageProvider,
  svlRuleDetailsUI: SvlRuleDetailsPageProvider,
  svlManagementPage: SvlManagementPageProvider,
  svlIngestPipelines: SvlIngestPipelines,
  svlApiKeys: SvlApiKeysProvider,
  svlDataUsagePage: SvlDataUsagePageProvider,
  svlCustomRolesPage: SvlCustomRolesPageProvider,
};
