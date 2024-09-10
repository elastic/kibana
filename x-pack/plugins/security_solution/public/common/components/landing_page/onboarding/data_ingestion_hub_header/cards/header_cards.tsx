/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import { COLOR_MODES_STANDARD, useEuiTheme } from '@elastic/eui';
import { useSpaceId } from '../../../../../hooks/use_space_id';
import video from '../../images/data_ingestion_hub_video.png';
import darkVideo from '../../images/dark_data_ingestion_hub_video.png';
import teammates from '../../images/data_ingestion_hub_teammates.png';
import darkTeammates from '../../images/dark_data_ingestion_hub_teammates.png';
import demo from '../../images/data_ingestion_hub_demo.png';
import darkDemo from '../../images/dark_data_ingestion_hub_demo.png';
import * as i18n from '../translations';
import { useUsersUrl } from '../../hooks/use_users_url';
import { VideoCard } from './video_card/video_card';
import { LinkCard } from './link_card/link_card';

const demoUrl = 'https://www.elastic.co/demo-gallery/security-overview';

export const useHeaderCards: () => ReactNode[] = () => {
  const { colorMode } = useEuiTheme();
  const isDarkMode = colorMode === COLOR_MODES_STANDARD.dark;
  const usersUrl = useUsersUrl();
  const spaceId = useSpaceId();

  const cards = useMemo(() => {
    const headerCards = [
      <LinkCard
        icon={isDarkMode ? darkTeammates : teammates}
        title={i18n.DATA_INGESTION_HUB_HEADER_TEAMMATES_TITLE}
        description={i18n.DATA_INGESTION_HUB_HEADER_TEAMMATES_DESCRIPTION}
        href={usersUrl}
        linkTitle={i18n.DATA_INGESTION_HUB_HEADER_TEAMMATES_LINK_TITLE}
      />,
      <LinkCard
        icon={isDarkMode ? darkDemo : demo}
        title={i18n.DATA_INGESTION_HUB_HEADER_DEMO_TITLE}
        description={i18n.DATA_INGESTION_HUB_HEADER_DEMO_DESCRIPTION}
        href={demoUrl}
        linkTitle={i18n.DATA_INGESTION_HUB_HEADER_DEMO_LINK_TITLE}
      />,
    ];

    if (spaceId) {
      return [
        <VideoCard
          spaceId={spaceId}
          icon={isDarkMode ? darkVideo : video}
          title={i18n.DATA_INGESTION_HUB_HEADER_VIDEO_TITLE}
          description={i18n.DATA_INGESTION_HUB_HEADER_VIDEO_DESCRIPTION}
        />,
        ...headerCards,
      ];
    }
    return headerCards;
  }, [isDarkMode, spaceId, usersUrl]);

  return cards;
};
