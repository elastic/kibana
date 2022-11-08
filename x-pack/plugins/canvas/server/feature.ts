/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/server';
import { KibanaFeatureConfig } from '../../features/common';
import { ReportingSetup } from '../../reporting/server';

/*
 * Register Canvas as a Kibana feature,
 * with Reporting sub-feature integration (if enabled)
 */
export function getCanvasFeature(plugins: { reporting?: ReportingSetup }): KibanaFeatureConfig {
  const includeReporting = plugins.reporting && plugins.reporting.usesUiCapabilities();

  return {
    id: 'canvas',
    name: 'Canvas',
    order: 300,
    category: DEFAULT_APP_CATEGORIES.kibana,
    app: ['canvas', 'kibana'],
    management: {
      ...(includeReporting ? { insightsAndAlerting: ['reporting'] } : {}),
    },
    catalogue: ['canvas'],
    privileges: {
      all: {
        app: ['canvas', 'kibana'],
        catalogue: ['canvas'],
        savedObject: {
          all: ['canvas-workpad', 'canvas-element'],
          read: ['index-pattern'],
        },
        ui: ['save', 'show'],
      },
      read: {
        app: ['canvas', 'kibana'],
        catalogue: ['canvas'],
        savedObject: {
          all: [],
          read: ['index-pattern', 'canvas-workpad', 'canvas-element'],
        },
        ui: ['show'],
      },
    },
    subFeatures: [
      ...(includeReporting
        ? ([
            {
              name: i18n.translate('xpack.canvas.features.reporting.pdfFeatureName', {
                defaultMessage: 'Reporting',
              }),
              privilegeGroups: [
                {
                  groupType: 'independent',
                  privileges: [
                    {
                      id: 'generate_report',
                      name: i18n.translate('xpack.canvas.features.reporting.pdf', {
                        defaultMessage: 'Generate PDF reports',
                      }),
                      includeIn: 'all',
                      management: { insightsAndAlerting: ['reporting'] },
                      minimumLicense: 'gold',
                      savedObject: { all: [], read: [] },
                      api: ['generateReport'],
                      ui: ['generatePdf'],
                    },
                  ],
                },
              ],
            },
          ] as const)
        : []),
    ],
  };
}
