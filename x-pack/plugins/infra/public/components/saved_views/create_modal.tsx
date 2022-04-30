/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
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

interface Props {
  isInvalid: boolean;
  close(): void;
  save(name: string, shouldIncludeTime: boolean): void;
}

export const SavedViewCreateModal = ({ close, save, isInvalid }: Props) => {
  const [viewName, setViewName] = useState('');
  const [includeTime, setIncludeTime] = useState(false);
  const onCheckChange = useCallback((e) => setIncludeTime(e.target.checked), []);
  const textChange = useCallback((e) => setViewName(e.target.value), []);

  const saveView = useCallback(() => {
    save(viewName, includeTime);
  }, [includeTime, save, viewName]);

  return (
    <EuiModal onClose={close} data-test-subj="savedViews-createModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            defaultMessage="Save View"
            id="xpack.infra.waffle.savedView.createHeader"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFieldText
          isInvalid={isInvalid}
          placeholder={i18n.translate('xpack.infra.waffle.savedViews.viewNamePlaceholder', {
            defaultMessage: 'Name',
          })}
          data-test-subj="savedViewViweName"
          value={viewName}
          onChange={textChange}
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
          onChange={onCheckChange}
        />
        <EuiSpacer size="s" />
        <EuiText size={'xs'} grow={false} style={{ maxWidth: 400 }}>
          <FormattedMessage
            defaultMessage="This changes the time filter to the currently selected time each time the view is loaded"
            id="xpack.infra.waffle.savedViews.includeTimeHelpText"
          />
        </EuiText>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={close}>
          <FormattedMessage
            defaultMessage="Cancel"
            id="xpack.infra.waffle.savedViews.cancelButton"
          />
        </EuiButtonEmpty>
        <EuiButton
          color="primary"
          disabled={!viewName}
          fill={true}
          onClick={saveView}
          data-test-subj="createSavedViewButton"
        >
          <FormattedMessage defaultMessage="Save" id="xpack.infra.waffle.savedViews.saveButton" />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
