/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
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
import type { PaletteOutput } from 'src/plugins/charts/public';
import type { CustomPaletteParams } from '../../../common';

export function SavePaletteModal({
  onSave,
  onCancel,
  paletteName,
  libraryPalettes,
}: {
  onSave: (title: string) => Promise<void> | undefined;
  onCancel: () => void;
  paletteName?: string;
  libraryPalettes?: Array<PaletteOutput<CustomPaletteParams>>;
}) {
  const [paletteTitle, setPaletteTitle] = useState(paletteName ?? '');
  const [validateTitleError, setValidateTitleError] = useState('');
  const [isPaletteOverwritten, setIsPaletteOverwritten] = useState(false);

  useEffect(() => {
    setIsPaletteOverwritten(Boolean(paletteName && paletteName === paletteTitle));
  }, [paletteName, paletteTitle]);

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
              disabled={!paletteTitle}
              onClick={() => {
                // check for duplicates
                const paletteExistsInLibrary = libraryPalettes?.some(
                  ({ params }) => params?.title === paletteTitle
                );
                if (paletteExistsInLibrary) {
                  setIsPaletteOverwritten(true);
                  setValidateTitleError(
                    i18n.translate('xpack.lens.palette.saveModal.paletteExists', {
                      defaultMessage:
                        'This palette already exists in the library. Do you want to overwrite it?',
                    })
                  );
                } else {
                  onSave?.(paletteTitle)?.catch((e) => {
                    setValidateTitleError(e.message);
                  });
                }
              }}
              data-test-subj="canvasCustomElementForm-submit"
            >
              {isPaletteOverwritten
                ? i18n.translate('xpack.lens.palette.saveModal.overwriteLabel', {
                    defaultMessage: 'Overwrite',
                  })
                : i18n.translate('xpack.lens.palette.saveModal.saveLabel', {
                    defaultMessage: 'Save',
                  })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}
