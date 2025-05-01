/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import { useWorkChatServices } from './use_workchat_service';

interface UseIntegrationDeleteProps {
  onDeleteSuccess?: () => void;
  onDeleteError?: (error: Error) => void;
}

export const useIntegrationDelete = ({
  onDeleteSuccess,
  onDeleteError,
}: UseIntegrationDeleteProps = {}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { integrationService } = useWorkChatServices();

  const deleteIntegration = useCallback(
    async (integrationId: string) => {
      setIsDeleting(true);
      try {
        await integrationService.delete(integrationId);
        if (onDeleteSuccess) {
          onDeleteSuccess();
        }
      } catch (error) {
        if (onDeleteError) {
          onDeleteError(error as Error);
        }
      } finally {
        setIsDeleting(false);
      }
    },
    [integrationService, onDeleteSuccess, onDeleteError]
  );

  return {
    deleteIntegration,
    isDeleting,
  };
};
