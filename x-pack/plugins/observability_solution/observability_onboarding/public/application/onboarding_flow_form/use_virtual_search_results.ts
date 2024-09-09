/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { reactRouterNavigate, useKibana } from '@kbn/kibana-react-plugin/public';
import { CustomCard } from '../packages_list/types';
import { ObservabilityOnboardingAppServices } from '../..';

export function useVirtualSearchResults(): CustomCard[] {
  const {
    services: {
      application,
      context: { isCloud },
    },
  } = useKibana<ObservabilityOnboardingAppServices>();

  const history = useHistory();
  const { href: firehoseUrl } = reactRouterNavigate(history, `/firehose/${location.search}`);
  const getUrlForApp = application?.getUrlForApp;
  const firehoseQuickstartCard: CustomCard = {
    id: 'firehose-quick-start',
    type: 'virtual',
    title: i18n.translate('xpack.observability_onboarding.packageList.uploadFileTitle', {
      defaultMessage: 'AWS Firehose',
    }),
    release: 'preview',
    description: i18n.translate(
      'xpack.observability_onboarding.packageList.uploadFileDescription',
      {
        defaultMessage: 'Collect logs and metrics from Amazon Web Services (AWS).',
      }
    ),
    name: 'firehose-quick-start',
    categories: [],
    icons: [
      {
        type: 'svg',
        src: 'https://epr.elastic.co/package/awsfirehose/1.1.0/img/logo_firehose.svg',
      },
    ],
    url: firehoseUrl,
    version: '',
    integration: '',
    isCollectionCard: false,
  };

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
    /**
     * The new Firehose card should only be visible on Cloud
     * as Firehose integration requires additional proxy,
     * which is not available for on-prem customers.
     */
    ...(isCloud ? [firehoseQuickstartCard] : []),
  ];
}
