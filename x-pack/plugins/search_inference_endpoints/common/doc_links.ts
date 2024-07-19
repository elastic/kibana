/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocLinks } from '@kbn/doc-links';

class InferenceEndpointsDocLinks {
  public nlpImportModel: string = '';
  public supportedNlpModels: string = '';
  public createInferenceEndpoint: string = '';

  constructor() {}

  setDocLinks(newDocLinks: DocLinks) {
    this.nlpImportModel = newDocLinks.ml.nlpImportModel;
    this.supportedNlpModels = newDocLinks.ml.supportedNlpModels;
    this.createInferenceEndpoint = newDocLinks.inference.createInferenceEndpoint;
  }
}

export const docLinks = new InferenceEndpointsDocLinks();
