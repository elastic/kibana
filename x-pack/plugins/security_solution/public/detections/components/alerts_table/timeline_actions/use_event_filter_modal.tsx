/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

export const useEventFilterModal = ({
  onAddEventFilterClick,
}: {
  onAddEventFilterClick: () => void;
}) => {
  const [isAddEventFilterModalOpen, setIsAddEventFilterModalOpen] = useState<boolean>(false);

  const closeAddEventFilterModal = useCallback((): void => {
    setIsAddEventFilterModalOpen(false);
  }, []);

  const openAddEventFilterModal = useCallback((): void => {
    setIsAddEventFilterModalOpen(true);
  }, []);

  const handleAddEventFilterClick = useCallback((): void => {
    if (onAddEventFilterClick) {
      onAddEventFilterClick();
    }
    openAddEventFilterModal();
  }, [onAddEventFilterClick, openAddEventFilterModal]);

  return { closeAddEventFilterModal, handleAddEventFilterClick, isAddEventFilterModalOpen };
};
