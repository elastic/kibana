/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, CoreStart, Plugin } from 'src/core/server';
import { schema } from '@kbn/config-schema';
import { fileUploadRoutes } from './routes';
import { initFileUploadTelemetry } from './telemetry';
import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/server';
import { UI_SETTING_MAX_FILE_SIZE, MAX_FILE_SIZE } from '../common';

interface SetupDeps {
  usageCollection: UsageCollectionSetup;
}

export class FileUploadPlugin implements Plugin {
  async setup(coreSetup: CoreSetup, plugins: SetupDeps) {
    fileUploadRoutes(coreSetup.http.createRouter());

    coreSetup.uiSettings.register({
      [UI_SETTING_MAX_FILE_SIZE]: {
        name: i18n.translate('xpack.fileUpload.maxFileSizeUiSetting.name', {
          defaultMessage: 'Maximum file upload size',
        }),
        value: MAX_FILE_SIZE,
        description: i18n.translate('xpack.fileUpload.maxFileSizeUiSetting.description', {
          defaultMessage:
            'Sets the file size limit when importing files. The highest supported value for this setting is 1GB.',
        }),
        schema: schema.string(),
        validation: {
          regexString: '\\d+[mMgG][bB]',
          message: i18n.translate('xpack.fileUpload.maxFileSizeUiSetting.error', {
            defaultMessage: 'Should be a valid data size. e.g. 200MB, 1GB',
          }),
        },
      },
    });

    initFileUploadTelemetry(coreSetup, plugins.usageCollection);
  }

  start(core: CoreStart) {}
}
