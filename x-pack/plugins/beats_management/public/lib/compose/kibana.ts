/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';
// @ts-ignore
import 'ui/autoload/all';
// @ts-ignore: path dynamic for kibana
import chrome from 'ui/chrome';
// @ts-ignore: path dynamic for kibana
import { management } from 'ui/management';
// @ts-ignore: path dynamic for kibana
import { uiModules } from 'ui/modules';
// @ts-ignore: path dynamic for kibana
import routes from 'ui/routes';

import { INDEX_NAMES } from '../../../common/constants/index_names';
import { supportedConfigs } from '../../config_schemas';
import { RestBeatsAdapter } from '../adapters/beats/rest_beats_adapter';
import { RestElasticsearchAdapter } from '../adapters/elasticsearch/rest';
import { KibanaFrameworkAdapter } from '../adapters/framework/kibana_framework_adapter';
import { AxiosRestAPIAdapter } from '../adapters/rest_api/axios_rest_api_adapter';
import { RestTagsAdapter } from '../adapters/tags/rest_tags_adapter';
import { RestTokensAdapter } from '../adapters/tokens/rest_tokens_adapter';
import { BeatsLib } from '../beats';
import { ElasticsearchLib } from '../elasticsearch';
import { FrontendDomainLibs, FrontendLibs } from '../lib';
import { TagsLib } from '../tags';

export function compose(): FrontendLibs {
  const api = new AxiosRestAPIAdapter(chrome.getXsrfToken(), chrome.getBasePath());
  const esAdapter = new RestElasticsearchAdapter(api, INDEX_NAMES.BEATS);

  const tags = new TagsLib(new RestTagsAdapter(api), supportedConfigs);
  const tokens = new RestTokensAdapter(api);
  const beats = new BeatsLib(new RestBeatsAdapter(api), {
    tags,
  });

  const domainLibs: FrontendDomainLibs = {
    tags,
    tokens,
    beats,
  };
  const pluginUIModule = uiModules.get('app/beats_management');

  const framework = new KibanaFrameworkAdapter(
    pluginUIModule,
    management,
    routes,
    chrome,
    XPackInfoProvider
  );

  const libs: FrontendLibs = {
    framework,
    elasticsearch: new ElasticsearchLib(esAdapter),
    ...domainLibs,
  };
  return libs;
}
