/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { CustomCard } from '../packages_list/types';

export function useVirtualSearchResults(): CustomCard[] {
  const {
    services: { application },
  } = useKibana();
  const getUrlForApp = application?.getUrlForApp;

  return [
    {
      id: 'upload-file-virtual',
      type: 'virtual',
      title: i18n.translate('xpack.observability_onboarding.packageList.uploadFileTitle', {
        defaultMessage: 'Upload a file',
      }),
      description: i18n.translate(
        'xpack.observability_onboarding.packageList.uploadFileDescription',
        {
          defaultMessage:
            'Upload data from a CSV, TSV, JSON or other log file to Elasticsearch for analysis.',
        }
      ),
      name: 'upload-file',
      categories: [],
      icons: [
        {
          type: 'eui',
          src: 'addDataApp',
        },
      ],
      url: `${getUrlForApp?.('home')}#/tutorial_directory/fileDataViz`,
      version: '',
      integration: '',
      isCollectionCard: false,
    },
  ];
}
