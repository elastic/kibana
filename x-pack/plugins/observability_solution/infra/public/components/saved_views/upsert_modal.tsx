/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonEmpty,
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiFieldText,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiText,
} from '@elastic/eui';
import { NonEmptyString } from '@kbn/io-ts-utils';

interface Props {
  onClose(): void;
  onSave(name: NonEmptyString, shouldIncludeTime: boolean): void;
  isSaving: boolean;
  initialName?: string;
  initialIncludeTime?: boolean;
  title: React.ReactNode;
}

const nameLabel = i18n.translate('xpack.infra.waffle.savedViews.viewNamePlaceholder', {
  defaultMessage: 'Name',
});

export const UpsertViewModal = ({
  onClose,
  onSave,
  isSaving,
  initialName = '',
  initialIncludeTime = false,
  title,
}: Props) => {
  const [viewName, setViewName] = useState(initialName);
  const [shouldIncludeTime, setIncludeTime] = useState(initialIncludeTime);

  const trimmedName = viewName.trim() as NonEmptyString;

  const handleNameChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setViewName(e.target.value);
  };

  const handleTimeCheckChange = (e: EuiSwitchEvent) => {
    setIncludeTime(e.target.checked);
  };

  const saveView = () => {
    onSave(trimmedName, shouldIncludeTime);
  };

  return (
    <EuiModal onClose={onClose} data-test-subj="savedViews-upsertModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFieldText
          placeholder={nameLabel}
          data-test-subj="savedViewName"
          value={viewName}
          onChange={handleNameChange}
          aria-label={nameLabel}
        />
        <EuiSpacer size="xl" />
        <EuiSwitch
          id={'saved-view-save-time-checkbox'}
          label={
            <FormattedMessage
              defaultMessage="Store time with view"
              id="xpack.infra.waffle.savedViews.includeTimeFilterLabel"
            />
          }
          checked={shouldIncludeTime}
          onChange={handleTimeCheckChange}
        />
        <EuiSpacer size="s" />
        <EuiText size="xs" grow={false} style={{ maxWidth: 400 }}>
          <FormattedMessage
            defaultMessage="This changes the time filter to the currently selected time each time the view is loaded"
            id="xpack.infra.waffle.savedViews.includeTimeHelpText"
          />
        </EuiText>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="infraSavedViewCreateModalCancelButton" onClick={onClose}>
          <FormattedMessage
            defaultMessage="Cancel"
            id="xpack.infra.waffle.savedViews.cancelButton"
          />
        </EuiButtonEmpty>
        <EuiButton
          disabled={trimmedName.length === 0}
          fill
          isLoading={isSaving}
          onClick={saveView}
          data-test-subj="createSavedViewButton"
        >
          <FormattedMessage defaultMessage="Save" id="xpack.infra.waffle.savedViews.saveButton" />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
