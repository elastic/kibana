/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import PropTypes from 'prop-types';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFilePicker,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ASSET_MAX_SIZE } from '../../../common/lib/constants';
import { Loading } from '../loading';
import { Asset } from './asset';
import { AssetType } from '../../../types';

const strings = {
  getDescription: () =>
    i18n.translate('xpack.canvas.assetModal.modalDescription', {
      defaultMessage:
        'Below are the image assets in this workpad. Any assets that are currently in use cannot be determined at this time. To reclaim space, delete assets.',
    }),
  getEmptyAssetsDescription: () =>
    i18n.translate('xpack.canvas.assetModal.emptyAssetsDescription', {
      defaultMessage: 'Import your assets to get started',
    }),
  getFilePickerPromptText: () =>
    i18n.translate('xpack.canvas.assetModal.filePickerPromptText', {
      defaultMessage: 'Select or drag and drop images',
    }),
  getLoadingText: () =>
    i18n.translate('xpack.canvas.assetModal.loadingText', {
      defaultMessage: 'Uploading images',
    }),
  getModalCloseButtonLabel: () =>
    i18n.translate('xpack.canvas.assetModal.modalCloseButtonLabel', {
      defaultMessage: 'Close',
    }),
  getModalTitle: () =>
    i18n.translate('xpack.canvas.assetModal.modalTitle', {
      defaultMessage: 'Manage workpad assets',
    }),
  getSpaceUsedText: (percentageUsed: number) =>
    i18n.translate('xpack.canvas.assetModal.spacedUsedText', {
      defaultMessage: '{percentageUsed}% space used',
      values: {
        percentageUsed,
      },
    }),
};

export interface Props {
  /** The assets to display within the modal */
  assets: AssetType[];
  /** Function to invoke when the modal is closed */
  onClose: () => void;
  onAddAsset: (file: File) => void;
}

export const AssetManager: FC<Props> = (props) => {
  const { assets, onClose, onAddAsset } = props;
  const [isLoading, setIsLoading] = useState(false);

  const assetsTotal = Math.round(
    assets.reduce((total, { value }) => total + value.length, 0) / 1024
  );

  const percentageUsed = Math.round((assetsTotal / ASSET_MAX_SIZE) * 100);

  const emptyAssets = (
    <EuiPanel className="canvasAssetManager__emptyPanel">
      <EuiEmptyPrompt
        iconType="importAction"
        title={<h2>{strings.getEmptyAssetsDescription()}</h2>}
        titleSize="xs"
      />
    </EuiPanel>
  );

  const onFileUpload = (files: FileList | null) => {
    if (files === null) {
      return;
    }

    setIsLoading(true);

    Promise.all(Array.from(files).map((file) => onAddAsset(file))).finally(() => {
      setIsLoading(false);
    });
  };

  return (
    <EuiModal
      onClose={() => onClose()}
      className="canvasAssetManager canvasModal--fixedSize"
      maxWidth="1000px"
    >
      <EuiModalHeader className="canvasAssetManager__modalHeader">
        <EuiModalHeaderTitle className="canvasAssetManager__modalHeaderTitle">
          {strings.getModalTitle()}
        </EuiModalHeaderTitle>
        <EuiFlexGroup className="canvasAssetManager__fileUploadWrapper">
          <EuiFlexItem grow={false}>
            {isLoading ? (
              <Loading animated text={strings.getLoadingText()} />
            ) : (
              <EuiFilePicker
                initialPromptText={strings.getFilePickerPromptText()}
                compressed
                display="default"
                multiple
                onChange={onFileUpload}
                accept="image/*"
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" color="subdued">
          <p>{strings.getDescription()}</p>
        </EuiText>
        <EuiSpacer />
        {assets.length ? (
          <EuiFlexGrid columns={4}>
            {assets.map((asset) => (
              <Asset asset={asset} key={asset.id} />
            ))}
          </EuiFlexGrid>
        ) : (
          emptyAssets
        )}
      </EuiModalBody>
      <EuiModalFooter className="canvasAssetManager__modalFooter">
        <EuiFlexGroup className="canvasAssetManager__meterWrapper" responsive={false}>
          <EuiFlexItem>
            <EuiProgress
              value={assetsTotal}
              max={ASSET_MAX_SIZE}
              color={percentageUsed < 90 ? 'success' : 'danger'}
              size="s"
              aria-labelledby="CanvasAssetManagerLabel"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false} className="eui-textNoWrap">
            <EuiText id="CanvasAssetManagerLabel">
              {strings.getSpaceUsedText(percentageUsed)}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiButton size="s" onClick={() => onClose()}>
          {strings.getModalCloseButtonLabel()}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

AssetManager.propTypes = {
  assets: PropTypes.arrayOf(PropTypes.object).isRequired,
  onClose: PropTypes.func.isRequired,
  onAddAsset: PropTypes.func.isRequired,
};
