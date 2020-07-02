/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
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
  EuiOverlayMask,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import PropTypes from 'prop-types';
import React, { FunctionComponent } from 'react';

import { ComponentStrings } from '../../../i18n';

import { ASSET_MAX_SIZE } from '../../../common/lib/constants';
import { Loading } from '../loading';
import { Asset } from './asset';
import { AssetType } from '../../../types';

const { AssetModal: strings } = ComponentStrings;

interface Props {
  /** The assets to display within the modal */
  assetValues: AssetType[];
  /** Indicates if assets are being loaded */
  isLoading: boolean;
  /** Function to invoke when the modal is closed */
  onClose: () => void;
  /** Function to invoke when a file is uploaded */
  onFileUpload: (assets: FileList | null) => void;
  /** Function to invoke when an asset is copied */
  onAssetCopy: (asset: AssetType) => void;
  /** Function to invoke when an asset is created */
  onAssetCreate: (asset: AssetType) => void;
  /** Function to invoke when an asset is deleted */
  onAssetDelete: (asset: AssetType) => void;
}

export const AssetModal: FunctionComponent<Props> = (props) => {
  const {
    assetValues,
    isLoading,
    onAssetCopy,
    onAssetCreate,
    onAssetDelete,
    onClose,
    onFileUpload,
  } = props;

  const assetsTotal = Math.round(
    assetValues.reduce((total, { value }) => total + value.length, 0) / 1024
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

  return (
    <EuiOverlayMask>
      <EuiModal
        onClose={onClose}
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
          {assetValues.length ? (
            <EuiFlexGrid columns={4}>
              {assetValues.map((asset) => (
                <Asset
                  asset={asset}
                  key={asset.id}
                  onCopy={onAssetCopy}
                  onCreate={onAssetCreate}
                  onDelete={onAssetDelete}
                />
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
                color={percentageUsed < 90 ? 'secondary' : 'danger'}
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
          <EuiButton size="s" onClick={onClose}>
            {strings.getModalCloseButtonLabel()}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};

AssetModal.propTypes = {
  assetValues: PropTypes.array,
  isLoading: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onFileUpload: PropTypes.func.isRequired,
  onAssetCopy: PropTypes.func.isRequired,
  onAssetCreate: PropTypes.func.isRequired,
  onAssetDelete: PropTypes.func.isRequired,
};
