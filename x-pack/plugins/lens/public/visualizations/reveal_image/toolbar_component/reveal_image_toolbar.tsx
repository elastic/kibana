/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/visualization-ui-components/public';
import { FileUpload } from '@kbn/shared-ux-file-upload';
import { DefaultFileKind } from '@kbn/files-plugin/common';
import { Origin } from '@kbn/expression-reveal-image-plugin/public';
import type { VisualizationToolbarProps } from '../../../types';
import { ToolbarPopover } from '../../../shared_components';
import './reveal_image_config_panel.scss';
import type { RevealImageVisualizationState } from '../constants';

export const RevealImageToolbar = memo(
  (props: VisualizationToolbarProps<RevealImageVisualizationState>) => {
    const { state, setState } = props;

    const [imageId, setImageId] = useState<string | null>(state.imageId);
    const [emptyImageId, setEmptyImageId] = useState<string | null>(state.emptyImageId);
    const [origin, setOrigin] = useState<Origin>(state.origin || Origin.BOTTOM);

    const { inputValue, handleInputChange } = useDebouncedValue({
      onChange: setState,
      value: state,
    });

    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
            <ToolbarPopover
              title={i18n.translate('xpack.lens.revealImage.appearanceLabel', {
                defaultMessage: 'Appearance',
              })}
              type="visualOptions"
              buttonDataTestSubj="lnsVisualOptionsButton"
              panelClassName="lnsRevealImageToolbar__popover"
            >
              <EuiFormRow
                display="columnCompressed"
                label={i18n.translate('xpack.lens.label.revealImage.image.header', {
                  defaultMessage: 'Image',
                })}
                fullWidth
              >
                <FileUpload
                  kind={DefaultFileKind.kind.id}
                  onDone={(files) => {
                    const newImageId = files[0].id;

                    if (newImageId) {
                      setImageId(newImageId);
                      handleInputChange({
                        ...inputValue,
                        origin,
                        emptyImageId,
                        imageId: newImageId,
                      });
                    }
                  }}
                  initialPromptText={imageId ? imageId : undefined}
                  compressed
                  className="lnsRevealImage__imageFilePicker"
                />
              </EuiFormRow>
              <EuiFormRow
                fullWidth
                display="columnCompressed"
                label={i18n.translate('xpack.lens.label.revealImage.emptyImage.header', {
                  defaultMessage: 'Background image',
                })}
              >
                <FileUpload
                  kind={DefaultFileKind.kind.id}
                  initialPromptText={emptyImageId ? emptyImageId : undefined}
                  onDone={(files) => {
                    const newImageId = files[0].id;

                    if (newImageId) {
                      setEmptyImageId(newImageId);
                      handleInputChange({
                        ...inputValue,
                        origin,
                        imageId,
                        emptyImageId: newImageId,
                      });
                    }
                  }}
                  compressed
                  className="lnsRevealImage__emptyImageFilePicker"
                />
              </EuiFormRow>
              <EuiFormRow
                fullWidth
                display="columnCompressed"
                label={i18n.translate('xpack.lens.label.revealImage.origin.header', {
                  defaultMessage: 'Origin',
                })}
              >
                <EuiSelect
                  options={[
                    { value: Origin.BOTTOM, text: 'Bottom' },
                    { value: Origin.TOP, text: 'Top' },
                    { value: Origin.LEFT, text: 'Left' },
                    { value: Origin.RIGHT, text: 'Right' },
                  ]}
                  value={origin}
                  onChange={(e) => {
                    setOrigin(e.target.value as Origin);
                    handleInputChange({
                      ...inputValue,
                      emptyImageId,
                      imageId,
                      origin: e.target.value as Origin,
                    });
                  }}
                />
              </EuiFormRow>
            </ToolbarPopover>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
