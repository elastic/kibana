/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecuritySolutionMatrixHistogramService } from '.';
import { KibanaPluginServiceFactory } from '../../../../../../src/plugins/presentation_util/public';
import { MATRIX_HISTOGRAM, MATRIX_HISTOGRAM_TEMPLATES } from '../../../common/constants';

export type SecuritySolutionMatrixHistogramTemplatesServiceFactory = KibanaPluginServiceFactory<
  SecuritySolutionMatrixHistogramService,
  CanvasStartDeps
>;

export const matrixHistogramTemplatesServiceFactory: SecuritySolutionMatrixHistogramTemplatesServiceFactory =
  ({ coreStart, startPlugins }) => {
    const getApiPath = function () {
      return `${MATRIX_HISTOGRAM}`;
    };

    return {
      createFromTemplate: (templateId: string) => {
        return coreStart.http.post(getApiPath(), {
          body: JSON.stringify({ templateId }),
        });
      },
      findTemplates: async () => coreStart.http.get(MATRIX_HISTOGRAM_TEMPLATES),
    };
  };
