/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import video from '../images/data_ingestion_hub_video.png';
import darkVideo from '../images/dark_data_ingestion_hub_video.png';
import teammates from '../images/data_ingestion_hub_teammates.png';
import darkTeammates from '../images/dark_data_ingestion_hub_teammates.png';
import demo from '../images/data_ingestion_hub_demo.png';
import darkDemo from '../images/dark_data_ingestion_hub_demo.png';
import * as i18n from './translations';
import { useUserSettingsUrl } from '../hooks/use_user_settings_url';

export interface Card {
  icon: string;
  key: string;
  title: string;
  description: string;
  link: {
    title: string;
    href: string | undefined;
  };
}

export const useDataIngestionHubHeaderCards: () => Card[] = () => {
  const { colorMode } = useEuiTheme();
  const isDarkMode = colorMode === 'DARK';
  const userSettingsUrl = useUserSettingsUrl();

  const cards = [
    {
      icon: isDarkMode ? darkVideo : video,
      key: 'video',
      title: i18n.DATA_INGESTION_HUB_HEADER_VIDEO_TITLE,
      description: i18n.DATA_INGESTION_HUB_HEADER_VIDEO_DESCRIPTION,
      link: {
        title: i18n.DATA_INGESTION_HUB_HEADER_VIDEO_LINK_TITLE,
        href: 'https://docs.elastic.co/integrations/elastic-security-intro',
      },
    },
    {
      icon: isDarkMode ? darkTeammates : teammates,
      key: 'teammates',
      title: i18n.DATA_INGESTION_HUB_HEADER_TEAMMATES_TITLE,
      description: i18n.DATA_INGESTION_HUB_HEADER_TEAMMATES_DESCRIPTION,
      link: {
        title: i18n.DATA_INGESTION_HUB_HEADER_TEAMMATES_LINK_TITLE,
        href: userSettingsUrl,
      },
    },
    {
      icon: isDarkMode ? darkDemo : demo,
      key: 'demo',
      title: i18n.DATA_INGESTION_HUB_HEADER_DEMO_TITLE,
      description: i18n.DATA_INGESTION_HUB_HEADER_DEMO_DESCRIPTION,
      link: {
        title: i18n.DATA_INGESTION_HUB_HEADER_DEMO_LINK_TITLE,
        href: 'https://www.elastic.co/demo-gallery?solutions=security&features=null',
      },
    },
  ];

  return cards;
};
