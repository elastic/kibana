/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiToolTip,
} from '@elastic/eui';

import { useNotifyService } from '../../services';

import { ConfirmModal } from '../confirm_modal';
import { Clipboard } from '../clipboard';
import { Download } from '../download';
import { AssetType } from '../../../types';

import { ComponentStrings } from '../../../i18n';

const { Asset: strings } = ComponentStrings;

interface Props {
  /** The asset to be rendered */
  asset: AssetType;
  /** The function to execute when the user clicks 'Create' */
  onCreate: (assetId: string) => void;
  /** The function to execute when the user clicks 'Delete' */
  onDelete: (asset: AssetType) => void;
}

export const Asset: FC<Props> = ({ asset, onCreate, onDelete }) => {
  const { success } = useNotifyService();
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);

  const onCopy = (result: boolean) => result && success(`Copied '${asset.id}' to clipboard`);

  const confirmModal = (
    <ConfirmModal
      isOpen={isConfirmModalVisible}
      title={strings.getConfirmModalTitle()}
      message={strings.getConfirmModalMessageText()}
      confirmButtonText={strings.getConfirmModalButtonLabel()}
      onConfirm={() => {
        setIsConfirmModalVisible(false);
        onDelete(asset);
      }}
      onCancel={() => setIsConfirmModalVisible(false)}
    />
  );

  const createImage = (
    <EuiFlexItem className="asset-create-image" grow={false}>
      <EuiToolTip content={strings.getCreateImageTooltip()}>
        <EuiButtonIcon
          iconType="vector"
          aria-label={strings.getCreateImageTooltip()}
          onClick={() => onCreate(asset.id)}
        />
      </EuiToolTip>
    </EuiFlexItem>
  );

  const downloadAsset = (
    <EuiFlexItem className="asset-download" grow={false}>
      <EuiToolTip content={strings.getDownloadAssetTooltip()}>
        <Download fileName={asset.id} content={asset.value}>
          <EuiButtonIcon iconType="sortDown" aria-label={strings.getDownloadAssetTooltip()} />
        </Download>
      </EuiToolTip>
    </EuiFlexItem>
  );

  const copyAsset = (
    <EuiFlexItem grow={false}>
      <EuiToolTip content={strings.getCopyAssetTooltip()}>
        <Clipboard content={asset.id} onCopy={onCopy}>
          <EuiButtonIcon iconType="copyClipboard" aria-label={strings.getCopyAssetTooltip()} />
        </Clipboard>
      </EuiToolTip>
    </EuiFlexItem>
  );

  const deleteAsset = (
    <EuiFlexItem grow={false}>
      <EuiToolTip content={strings.getDeleteAssetTooltip()}>
        <EuiButtonIcon
          color="danger"
          iconType="trash"
          aria-label={strings.getDeleteAssetTooltip()}
          onClick={() => setIsConfirmModalVisible(true)}
        />
      </EuiToolTip>
    </EuiFlexItem>
  );

  const thumbnail = (
    <div className="canvasAsset__thumb canvasCheckered">
      <EuiImage
        className="canvasAsset__img"
        size="original"
        url={asset.value}
        fullScreenIconColor="dark"
        alt={strings.getThumbnailAltText()}
      />
    </div>
  );

  const assetLabel = (
    <EuiText size="xs" className="eui-textBreakAll">
      <p className="eui-textBreakAll">
        <strong>{asset.id}</strong>
        <br />
        <EuiTextColor color="subdued">
          <small>({Math.round(asset.value.length / 1024)} kb)</small>
        </EuiTextColor>
      </p>
    </EuiText>
  );

  return (
    <EuiFlexItem key={asset.id}>
      <EuiPanel className="canvasAsset" paddingSize="s">
        {thumbnail}
        <EuiSpacer size="s" />
        {assetLabel}
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems="baseline" justifyContent="center" responsive={false}>
          {createImage}
          {downloadAsset}
          {copyAsset}
          {deleteAsset}
        </EuiFlexGroup>
      </EuiPanel>
      {isConfirmModalVisible ? confirmModal : null}
    </EuiFlexItem>
  );
};
