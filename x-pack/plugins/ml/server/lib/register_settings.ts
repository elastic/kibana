/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/server';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { FILE_DATA_VISUALIZER_MAX_FILE_SIZE } from '../../common/constants/settings';
import { MAX_FILE_SIZE } from '../../common/constants/file_datavisualizer';

export function registerKibanaSettings(coreSetup: CoreSetup) {
  coreSetup.uiSettings.register({
    [FILE_DATA_VISUALIZER_MAX_FILE_SIZE]: {
      name: i18n.translate('xpack.ml.maxFileSizeSettingsName', {
        defaultMessage: 'File Data Visualizer maximum file upload size',
      }),
      value: MAX_FILE_SIZE,
      description: i18n.translate('xpack.ml.maxFileSizeSettingsDescription', {
        defaultMessage:
          'Sets the file size limit when importing data in the File Data Visualizer. The highest supported value for this setting is 1GB.',
      }),
      category: ['Machine Learning'],
      schema: schema.string(),
      validation: {
        regexString: '\\d+[mMgG][bB]',
        message: i18n.translate('xpack.ml.maxFileSizeSettingsError', {
          defaultMessage: 'Should be a valid data size. e.g. 200MB, 1GB',
        }),
      },
    },
  });
}
