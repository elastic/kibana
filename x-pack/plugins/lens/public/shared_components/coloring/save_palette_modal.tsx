/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiModal,
  EuiModalHeaderTitle,
  EuiModalHeader,
  EuiModalBody,
  EuiFieldText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export function SavePaletteModal({
  onSave,
  onCancel,
}: {
  onSave: (title: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [paletteTitle, setPaletteTitle] = useState('');
  const [validateTitleError, setValidateTitleError] = useState('');

  return (
    <EuiModal
      className="lnsSavePaletteModal"
      maxWidth={700}
      onClose={onCancel}
      initialFocus=".lnsSavePaletteModalTitle"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h3>
            {i18n.translate('xpack.lens.palette.saveModal.headerTitle', {
              defaultMessage: 'Save palette to the library',
            })}
          </h3>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart">
          <EuiFlexItem className="lnsSavePaletteModalForm" grow={2}>
            <EuiFormRow
              label={i18n.translate('xpack.lens.palette.saveModal.textFieldLabel', {
                defaultMessage: 'Palette title',
              })}
              display="rowCompressed"
              isInvalid={!!validateTitleError}
              error={[validateTitleError]}
            >
              <EuiFieldText
                value={paletteTitle}
                className="lnsSavePaletteModalTitle"
                onChange={(e) => setPaletteTitle(e.target.value)}
                required
                data-test-subj="lnsSavePaletteModalForm-name"
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onCancel}>
              {i18n.translate('xpack.lens.palette.saveModal.cancelLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={() => {
                // palette title is required
                if (paletteTitle === '') {
                  setValidateTitleError(
                    i18n.translate('xpack.lens.palette.saveModal.titleRequiredError', {
                      defaultMessage: 'Title is required',
                    })
                  );
                } else {
                  onSave(paletteTitle).catch((e) => {
                    setValidateTitleError(e.message);
                  });
                }
              }}
              data-test-subj="canvasCustomElementForm-submit"
            >
              {i18n.translate('xpack.lens.palette.saveModal.saveLabel', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}
