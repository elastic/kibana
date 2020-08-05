/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { camelCase } from 'lodash';
import { configBlockSchemas } from '../../../../../legacy/plugins/beats_management/common/config_schemas';
import { translateConfigSchema } from '../../../../../legacy/plugins/beats_management/common/config_schemas_translations_map';
import { INDEX_NAMES } from '../../../../../legacy/plugins/beats_management/common/constants/index_names';
import { RestBeatsAdapter } from '../adapters/beats/rest_beats_adapter';
import { RestConfigBlocksAdapter } from '../adapters/configuration_blocks/rest_config_blocks_adapter';
import { RestElasticsearchAdapter } from '../adapters/elasticsearch/rest';
import { KibanaFrameworkAdapter } from '../adapters/framework/kibana_framework_adapter';
import { AxiosRestAPIAdapter } from '../adapters/rest_api/axios_rest_api_adapter';
import { RestTagsAdapter } from '../adapters/tags/rest_tags_adapter';
import { RestTokensAdapter } from '../adapters/tokens/rest_tokens_adapter';
import { BeatsLib } from '../beats';
import { ConfigBlocksLib } from '../configuration_blocks';
import { ElasticsearchLib } from '../elasticsearch';
import { TagsLib } from '../tags';
import { FrontendLibs } from '../types';
import { PLUGIN } from '../../../../../legacy/plugins/beats_management/common/constants/plugin';
import { FrameworkLib } from './../framework';
import { ManagementSetup } from '../../../../../../src/plugins/management/public';
import { SecurityPluginSetup } from '../../../../security/public';
import { CoreSetup } from '../../../../../../src/core/public';
import { LicensingPluginSetup } from '../../../../licensing/public';
import { BeatsManagementConfigType } from '../../../common';

interface ComposeDeps {
  core: CoreSetup;
  management: ManagementSetup;
  licensing: LicensingPluginSetup;
  config: BeatsManagementConfigType;
  version: string;
  security?: SecurityPluginSetup;
}

export function compose({
  core,
  management,
  licensing,
  config,
  version,
  security,
}: ComposeDeps): FrontendLibs {
  const api = new AxiosRestAPIAdapter(version, core.http.basePath.get());
  const esAdapter = new RestElasticsearchAdapter(INDEX_NAMES.BEATS);
  const elasticsearchLib = new ElasticsearchLib(esAdapter);
  const configBlocks = new ConfigBlocksLib(
    new RestConfigBlocksAdapter(api),
    translateConfigSchema(configBlockSchemas)
  );
  const tags = new TagsLib(new RestTagsAdapter(api), elasticsearchLib);
  const tokens = new RestTokensAdapter(api);
  const beats = new BeatsLib(new RestBeatsAdapter(api), elasticsearchLib);

  const framework = new FrameworkLib(
    new KibanaFrameworkAdapter(
      camelCase(PLUGIN.ID),
      management,
      core.http.basePath.get,
      licensing,
      security,
      config,
      version
    )
  );

  const libs: FrontendLibs = {
    framework,
    elasticsearch: elasticsearchLib,
    tags,
    tokens,
    beats,
    configBlocks,
  };
  return libs;
}
