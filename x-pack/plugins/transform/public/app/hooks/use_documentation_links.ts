/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAppDependencies } from '../app_dependencies';

export const useDocumentationLinks = () => {
  const deps = useAppDependencies();
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = deps.docLinks;
  return {
    esAggsCompositeMissingBucket: deps.docLinks.links.aggs.composite_missing_bucket,
    esIndicesCreateIndex: deps.docLinks.links.apis.createIndex,
    esPluginDocBasePath: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/plugins/${DOC_LINK_VERSION}/`,
    esQueryDsl: deps.docLinks.links.query.queryDsl,
    esTransform: deps.docLinks.links.transforms.guide,
    esTransformPivot: deps.docLinks.links.apis.createTransformRequest,
    esTransformUpdate: deps.docLinks.links.apis.updateTransform,
  };
};
