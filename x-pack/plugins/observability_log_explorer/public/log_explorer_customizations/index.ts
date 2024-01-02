/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateLogExplorerController } from '@kbn/log-explorer-plugin/public';
import { renderFlyoutContent } from './flyout_content';

export const createLogExplorerControllerWithCustomizations =
  (createLogExplorerController: CreateLogExplorerController): CreateLogExplorerController =>
  (args) =>
    createLogExplorerController({
      ...args,
      customizations: {
        ...args.customizations,
        flyout: {
          renderContent: renderFlyoutContent,
        },
      },
    });
