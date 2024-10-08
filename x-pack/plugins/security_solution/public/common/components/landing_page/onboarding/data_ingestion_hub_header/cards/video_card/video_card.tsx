/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useLocalStorage } from 'react-use';
import { EuiLink, EuiText } from '@elastic/eui';
import { Card } from '../card';
import { DataIngestionHubVideoModal } from './video_modal';
import * as i18n from '../../translations';

interface VideoCardProps {
  icon: string;
  title: string;
  description: string;
  spaceId: string;
}

export const getStorageKeyBySpace = (storageKey: string, spaceId: string | null | undefined) => {
  if (spaceId == null) {
    return storageKey;
  }
  return `${storageKey}.${spaceId}`;
};

const IS_ONBOARDING_HUB_VISITED_LOCAL_STORAGE_KEY = 'secutirySolution.isOnboardingHubVisited';

export const VideoCard: React.FC<VideoCardProps> = React.memo((props) => {
  const { icon, title, description, spaceId } = props;
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
      <Card onClick={showVideoModal} icon={icon} title={title} description={description}>
        <EuiText size="xs">
          <EuiLink onClick={showVideoModal}>
            {i18n.DATA_INGESTION_HUB_HEADER_VIDEO_LINK_TITLE}
          </EuiLink>
        </EuiText>
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
