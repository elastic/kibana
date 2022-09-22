/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocLinks } from '../../../../private/var/tmp/_bazel_maxcold/fce807b6c2551c4f3f2c619f16f76292/execroot/kibana/bazel-out/darwin_arm64-fastbuild/bin/packages/kbn-doc-links/npm_module_types';
import { useKibana } from '../../kibana_interop/hooks/use_kibana';

const useKibanaDocumentationLinks = (): DocLinks => useKibana().services.docLinks.links;

export const useTIDocumentationLink = (): string =>
  useKibanaDocumentationLinks().securitySolution.threatIntelInt;
