/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useLocalStorage } from 'react-use';
import { EuiButtonEmpty } from '@elastic/eui';
import { Card } from '../card';
import { DataIngestionHubVideoModal } from './video_modal';
import { useSpaceId } from '../../../../../../hooks/use_space_id';
import * as i18n from '../../translations';
import { useCardStyles } from '../card.styles';

interface VideoCardProps {
  icon: string;
  title: string;
  description: string;
}

export const getStorageKeyBySpace = (storageKey: string, spaceId: string | null | undefined) => {
  if (spaceId == null) {
    return storageKey;
  }
  return `${storageKey}.${spaceId}`;
};

const IS_ONBOARDING_HUB_VISITED_LOCAL_STORAGE_KEY = 'secutirySolution.isOnboardingHubVisited';

export const VideoCard: React.FC<VideoCardProps> = React.memo((props) => {
  const { icon, title, description } = props;
  const spaceId = useSpaceId();
  const { cardButtonStyle } = useCardStyles();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const isOnboardingHubVisitedStorageKey = getStorageKeyBySpace(
    IS_ONBOARDING_HUB_VISITED_LOCAL_STORAGE_KEY,
    spaceId
  );

  const [isOnboardingHubVisited, setIsOnboardingHubVisited] = useLocalStorage<boolean | null>(
    isOnboardingHubVisitedStorageKey,
    null
  );

  const closeVideoModal = () => {
    if (isOnboardingHubVisited === null) {
      setIsOnboardingHubVisited(true);
    }
    setIsModalVisible(false);
  };

  const showVideoModal = () => {
    setIsModalVisible(true);
  };

  return (
    <>
      <Card icon={icon} title={title} description={description}>
        <EuiButtonEmpty color="primary" onClick={showVideoModal} className={cardButtonStyle}>
          {i18n.DATA_INGESTION_HUB_HEADER_VIDEO_LINK_TITLE}
        </EuiButtonEmpty>
      </Card>
      {isModalVisible && (
        <DataIngestionHubVideoModal
          onCloseModal={closeVideoModal}
          isOnboardingHubVisited={isOnboardingHubVisited}
        />
      )}
    </>
  );
});

VideoCard.displayName = 'VideoCard';
