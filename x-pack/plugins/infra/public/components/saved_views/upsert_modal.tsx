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
  EuiText,
} from '@elastic/eui';
import { EuiSwitchEvent } from '@elastic/eui';

interface Props {
  isInvalid: boolean;
  onClose(): void;
  onSave(name: string, shouldIncludeTime: boolean): void;
  initialName?: string;
  initialIncludeTime?: boolean;
  title: React.ReactNode;
}

export const UpsertViewModal = ({
  onClose,
  onSave,
  isInvalid,
  initialName = '',
  initialIncludeTime = false,
  title,
}: Props) => {
  const [viewName, setViewName] = useState(initialName);
  const [includeTime, setIncludeTime] = useState(initialIncludeTime);

  const handleNameChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setViewName(e.target.value);
  };

  const handleTimeCheckChange = (e: EuiSwitchEvent) => {
    setIncludeTime(e.target.checked);
  };

  const saveView = () => {
    onSave(viewName, includeTime);
  };

  return (
    <EuiModal onClose={onClose} data-test-subj="savedViews-upsertModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFieldText
          isInvalid={isInvalid}
          placeholder={i18n.translate('xpack.infra.waffle.savedViews.viewNamePlaceholder', {
            defaultMessage: 'Name',
          })}
          data-test-subj="savedViewName"
          value={viewName}
          onChange={handleNameChange}
          aria-label={i18n.translate('xpack.infra.waffle.savedViews.viewNamePlaceholder', {
            defaultMessage: 'Name',
          })}
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
          checked={includeTime}
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
          color="primary"
          disabled={viewName.length === 0}
          fill
          onClick={saveView}
          data-test-subj="createSavedViewButton"
        >
          <FormattedMessage defaultMessage="Save" id="xpack.infra.waffle.savedViews.saveButton" />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
