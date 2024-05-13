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
    services: { application, http },
  } = useKibana();
  const getUrlForApp = application?.getUrlForApp;
  const basePath = http?.basePath;

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
    {
      id: 'aws-firehose-virtual',
      type: 'virtual',
      title: i18n.translate('xpack.observability_onboarding.packageList.amazonFirehoseTitle', {
        defaultMessage: 'Amazon Firehose',
      }),
      description: i18n.translate(
        'xpack.observability_onboarding.packageList.amazonFirehoseDescription',
        {
          defaultMessage: 'Collect Amazon Firehose logs.',
        }
      ),
      name: 'aws-firehose',
      categories: [],
      icons: [
        {
          type: 'svg',
          src: basePath?.prepend('/plugins/observabilityOnboarding/assets/aws_firehose.svg') ?? '',
        },
      ],
      url: 'https://www.elastic.co/guide/en/kinesis/current/aws-firehose-setup-guide.html',
      version: '',
      integration: '',
      isCollectionCard: false,
    },
  ];
}
