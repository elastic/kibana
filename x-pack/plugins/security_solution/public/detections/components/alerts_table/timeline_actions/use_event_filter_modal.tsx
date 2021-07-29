/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { ACTION_ADD_EVENT_FILTER } from '../translations';

export const useEventFilterModal = () => {
  const [isAddEventFilterModalOpen, setIsAddEventFilterModalOpen] = useState<boolean>(false);

  const onAddEventFilterClick = useCallback((): void => {
    setIsAddEventFilterModalOpen(true);
  }, []);
  const closeAddEventFilterModal = useCallback((): void => {
    setIsAddEventFilterModalOpen(false);
  }, []);

  return { closeAddEventFilterModal, isAddEventFilterModalOpen, onAddEventFilterClick };
};

export const useEventFilterAction = ({
  onAddEventFilterClick,
}: {
  onAddEventFilterClick: () => void;
}) => {
  const eventFilterActions = useMemo(
    () => ({
      name: ACTION_ADD_EVENT_FILTER,
      onClick: onAddEventFilterClick,
    }),
    [onAddEventFilterClick]
  );
  return eventFilterActions;
};
