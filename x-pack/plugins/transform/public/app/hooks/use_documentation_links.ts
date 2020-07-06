/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useAppDependencies } from '../app_dependencies';

import { TRANSFORM_DOC_PATHS } from '../constants';

export const useDocumentationLinks = () => {
  const deps = useAppDependencies();
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = deps.docLinks;
  return {
    esDocBasePath: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/`,
    esIndicesCreateIndex: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/indices-create-index.html#indices-create-index`,
    esPluginDocBasePath: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/plugins/${DOC_LINK_VERSION}/`,
    esQueryDsl: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/query-dsl.html`,
    esStackOverviewDocBasePath: `${ELASTIC_WEBSITE_URL}guide/en/elastic-stack-overview/${DOC_LINK_VERSION}/`,
    esTransform: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/${TRANSFORM_DOC_PATHS.transforms}`,
    esTransformPivot: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/put-transform.html#put-transform-request-body`,
    esTransformUpdate: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/update-transform.html`,
    mlDocBasePath: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/`,
  };
};
