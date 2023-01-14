/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  htmlIdGenerator,
} from '@elastic/eui';
import type { EuiFilePickerProps } from '@elastic/eui/src/components/form/file_picker/file_picker';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import type { CommandArgumentValueSelectorProps } from '../console/types';

const ArgumentFileSelectorContainer = styled.div`
  .popoverAnchor {
    display: block;
  }
`;

const INITIAL_DISPLAY_LABEL = i18n.translate(
  'xpack.securitySolution.consoleArgumentSelectors.fileSelector.initialDisplayLabel',
  { defaultMessage: 'Click to select file' }
);

const OPEN_FILE_PICKER_LABEL = i18n.translate(
  'xpack.securitySolution.consoleArgumentSelectors.fileSelector.filePickerButtonLabel',
  { defaultMessage: 'Open file picker' }
);

const NO_FILE_SELECTED = i18n.translate(
  'xpack.securitySolution.consoleArgumentSelectors.fileSelector.noFileSelected',
  { defaultMessage: 'No file selected' }
);

/**
 * A Console Argument Selector component that enables the user to select a file from the local machine
 */
export const ArgumentFileSelector = memo<CommandArgumentValueSelectorProps<File>>(
  ({ value, valueText, onChange }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(!value);

    const filePickerUUID = useMemo(() => {
      return htmlIdGenerator('console')();
    }, []);

    const handleOpenPopover = useCallback(() => {
      setIsPopoverOpen((prevState) => !prevState);
    }, []);

    const handleClosePopover = useCallback(() => {
      setIsPopoverOpen(false);
    }, []);

    const handleFileSelection: EuiFilePickerProps['onChange'] = useCallback(
      (selectedFiles) => {
        // Get only the first file selected
        const file = selectedFiles?.item(0);

        onChange({
          value: file ?? undefined,
          valueText: file ? file.name : '',
        });

        setIsPopoverOpen(false);
      },
      [onChange]
    );

    return (
      <ArgumentFileSelectorContainer>
        <EuiPopover
          isOpen={isPopoverOpen}
          closePopover={handleClosePopover}
          anchorPosition="upCenter"
          initialFocus={`#${filePickerUUID}`}
          anchorClassName="popoverAnchor"
          button={
            <EuiFlexGroup responsive={false} alignItems="center" gutterSize="none">
              <EuiFlexItem grow={false} className="eui-textTruncate" onClick={handleOpenPopover}>
                <div className="eui-textTruncate" title={valueText || NO_FILE_SELECTED}>
                  {valueText || INITIAL_DISPLAY_LABEL}
                </div>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="folderOpen"
                  size="xs"
                  onClick={handleOpenPopover}
                  aria-label={OPEN_FILE_PICKER_LABEL}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          {isPopoverOpen && (
            <EuiFilePicker
              id={filePickerUUID}
              onChange={handleFileSelection}
              fullWidth
              display="large"
            />
          )}
        </EuiPopover>
      </ArgumentFileSelectorContainer>
    );
  }
);
ArgumentFileSelector.displayName = 'ArgumentFileSelector';
