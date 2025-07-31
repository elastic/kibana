/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';
import { useAgentEdition } from '../../hooks/use_agent_edition';
import { useNavigation } from '../../hooks/use_navigation';
import { appPaths } from '../../app_paths';

export interface AssistantModalWrapperProps {
  agentId?: string;
  modalType: 'create' | 'editName' | 'editPrompt';
  onClose: () => void;
  children: (props: {
    editState: any;
    setFieldValue: (field: string, value: any) => void;
    submit: () => void;
    isSubmitting: boolean;
  }) => React.ReactNode;
}

export const AssistantModalWrapper: React.FC<AssistantModalWrapperProps> = ({
  agentId,
  modalType,
  onClose,
  children,
}) => {
  const {
    services: { notifications },
  } = useKibana();
  const { navigateToWorkchatUrl } = useNavigation();

  const getSuccessMessage = () => {
    switch (modalType) {
      case 'create':
        return i18n.translate('workchatApp.assistants.createSuccessMessage', {
          defaultMessage: 'Assistant created successfully',
        });
      case 'editName':
        return i18n.translate('workchatApp.assistants.editNameSuccessMessage', {
          defaultMessage: 'Assistant name updated successfully',
        });
      case 'editPrompt':
        return i18n.translate('workchatApp.assistants.editPromptSuccessMessage', {
          defaultMessage: 'Assistant prompt updated successfully',
        });
      default:
        return i18n.translate('workchatApp.assistants.updateSuccessMessage', {
          defaultMessage: 'Assistant updated successfully',
        });
    }
  };

  const { editState, setFieldValue, submit, isSubmitting } = useAgentEdition({
    agentId,
    onSaveSuccess: (agent) => {
      notifications.toasts.addSuccess(getSuccessMessage());
      onClose();

      // Navigate to edit page for new assistants
      if (modalType === 'create') {
        navigateToWorkchatUrl(appPaths.assistants.edit({ agentId: agent.id }));
      }
    },
  });

  return (
    <>
      {children({
        editState,
        setFieldValue,
        submit,
        isSubmitting,
      })}
    </>
  );
};
