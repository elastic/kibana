/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { OnboardingTopicId } from '../../constants';
import type { OnboardingRouteParams } from '../../types';
import { useUrlDetail } from './use_url_detail';

/**
 * Hook that returns the topic id from the URL, or the default topic id if none is present
 * This is the Single Source of Truth for the topic id
 */
export const useTopicId = (): OnboardingTopicId => {
  const { topicId = OnboardingTopicId.default } = useParams<OnboardingRouteParams>();
  return topicId;
};

export const useTopic = (): [OnboardingTopicId, (topicId: OnboardingTopicId) => void] => {
  const topicId = useTopicId();
  const { setTopicDetail } = useUrlDetail();

  const setTopicId = useCallback(
    (newTopicId: OnboardingTopicId) => {
      setTopicDetail(newTopicId);
    },
    [setTopicDetail]
  );

  return [topicId, setTopicId];
};
