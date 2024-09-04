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
import { useUsersUrl } from '../hooks/use_users_url';

export enum HeaderCardAsTypeEnum {
  action = 'action',
  link = 'link',
}

export interface HeaderCard {
  icon: string;
  key: string;
  title: string;
  description: string;
  link?: {
    title: string;
    href: string | undefined;
  };
  action?: { title: string; trigger: () => void };
  asType: HeaderCardAsTypeEnum;
}

export const useDataIngestionHubHeaderCards: (actions: {
  videoAction: () => void;
}) => HeaderCard[] = (actions) => {
  const { videoAction } = actions;
  const { colorMode } = useEuiTheme();
  const isDarkMode = colorMode === 'DARK';
  const usersUrl = useUsersUrl();

  const cards = [
    {
      icon: isDarkMode ? darkVideo : video,
      key: 'video',
      asType: HeaderCardAsTypeEnum.action,
      title: i18n.DATA_INGESTION_HUB_HEADER_VIDEO_TITLE,
      description: i18n.DATA_INGESTION_HUB_HEADER_VIDEO_DESCRIPTION,
      action: { title: i18n.DATA_INGESTION_HUB_HEADER_VIDEO_LINK_TITLE, trigger: videoAction },
    },
    {
      icon: isDarkMode ? darkTeammates : teammates,
      key: 'teammates',
      asType: HeaderCardAsTypeEnum.link,
      title: i18n.DATA_INGESTION_HUB_HEADER_TEAMMATES_TITLE,
      description: i18n.DATA_INGESTION_HUB_HEADER_TEAMMATES_DESCRIPTION,
      link: {
        title: i18n.DATA_INGESTION_HUB_HEADER_TEAMMATES_LINK_TITLE,
        href: usersUrl,
      },
    },
    {
      icon: isDarkMode ? darkDemo : demo,
      key: 'demo',
      asType: HeaderCardAsTypeEnum.link,
      title: i18n.DATA_INGESTION_HUB_HEADER_DEMO_TITLE,
      description: i18n.DATA_INGESTION_HUB_HEADER_DEMO_DESCRIPTION,
      link: {
        title: i18n.DATA_INGESTION_HUB_HEADER_DEMO_LINK_TITLE,
        href: 'https://www.elastic.co/demo-gallery/security-overview',
      },
    },
  ];

  return cards;
};
