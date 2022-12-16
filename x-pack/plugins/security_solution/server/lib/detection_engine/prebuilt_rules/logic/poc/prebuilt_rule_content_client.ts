/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertUnreachable } from '../../../../../../common/utility_types';
import { withSecuritySpan } from '../../../../../utils/with_security_span';
import type { PrebuiltRuleContentDataModel } from '../../../../../../common/detection_engine/prebuilt_rules/poc/api/get_prebuilt_rules_status/request_schema';
import type { PrebuiltRuleContent } from '../../../../../../common/detection_engine/prebuilt_rules/poc/content_model/prebuilt_rule_content';
import type { PrebuiltRuleVersionInfo } from '../../../../../../common/detection_engine/prebuilt_rules/poc/content_model/prebuilt_rule_version_info';
import type { ICompositeRuleAssetsClient } from './saved_objects/rule_asset_composite_saved_objects_client';
import type { IComposite2RuleAssetsClient } from './saved_objects/rule_asset_composite2_saved_objects_client';
import type { IFlatRuleAssetsClient } from './saved_objects/rule_asset_flat_saved_objects_client';

export interface IPrebuiltRuleContentClient {
  fetchLatestVersions(dataModel: PrebuiltRuleContentDataModel): Promise<PrebuiltRuleVersionInfo[]>;

  fetchRulesByVersionInfo(
    dataModel: PrebuiltRuleContentDataModel,
    versions: PrebuiltRuleVersionInfo[]
  ): Promise<PrebuiltRuleContent[]>;
}

export const createPrebuiltRuleContentClient = (
  flatClient: IFlatRuleAssetsClient,
  compositeClient: ICompositeRuleAssetsClient,
  composite2Client: IComposite2RuleAssetsClient
): IPrebuiltRuleContentClient => {
  const pickClient = (dataModel: PrebuiltRuleContentDataModel) => {
    switch (dataModel) {
      case 'flat':
        return flatClient;
      case 'composite':
        return compositeClient;
      case 'composite2':
        return composite2Client;
      default:
        return assertUnreachable(dataModel);
    }
  };

  return {
    fetchLatestVersions: (
      dataModel: PrebuiltRuleContentDataModel
    ): Promise<PrebuiltRuleVersionInfo[]> => {
      return withSecuritySpan('IPrebuiltRuleContentClient.fetchLatestVersions', async () => {
        const client = pickClient(dataModel);
        const items = await client.fetchLatestVersions();
        return items;
      });
    },

    fetchRulesByVersionInfo: (
      dataModel: PrebuiltRuleContentDataModel,
      versions: PrebuiltRuleVersionInfo[]
    ): Promise<PrebuiltRuleContent[]> => {
      return withSecuritySpan('IPrebuiltRuleContentClient.fetchRulesByVersionInfo', async () => {
        const client = pickClient(dataModel);
        const items = await client.fetchRulesByIdAndVersion({
          rules: versions.map((v) => ({ id: v.rule_id, version: v.rule_content_version })),
        });
        return items;
      });
    },
  };
};
