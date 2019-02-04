/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiButton,
  EuiOverlayMask,
  EuiModal,
  EuiModalHeader,
  EuiModalBody,
  EuiText,
  EuiImage,
  EuiPanel,
  EuiModalFooter,
  EuiModalHeaderTitle,
  EuiFlexGrid,
  EuiProgress,
  EuiSpacer,
  EuiTextColor,
  EuiToolTip,
  EuiFilePicker,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { ConfirmModal } from '../confirm_modal';
import { Clipboard } from '../clipboard';
import { Download } from '../download';
import { Loading } from '../loading';

export class AssetManager extends React.PureComponent {
  static propTypes = {
    assets: PropTypes.array,
    addImageElement: PropTypes.func,
    removeAsset: PropTypes.func.isRequired,
    copyAsset: PropTypes.func.isRequired,
    onAssetAdd: PropTypes.func.isRequired,
  };

  state = {
    deleteId: null,
    isModalVisible: false,
    loading: false,
  };

  _isMounted = true;

  showModal = () => this.setState({ isModalVisible: true });
  closeModal = () => this.setState({ isModalVisible: false });

  doDelete = () => {
    this.resetDelete();
    this.props.removeAsset(this.state.deleteId);
  };

  handleFileUpload = files => {
    this.setState({ loading: true });
    Promise.all(Array.from(files).map(file => this.props.onAssetAdd(file))).finally(() => {
      this._isMounted && this.setState({ loading: false });
    });
  };

  addElement = assetId => {
    this.props.addImageElement(assetId);
  };

  resetDelete = () => this.setState({ deleteId: null });

  renderAsset = asset => (
    <EuiFlexItem key={asset.id}>
      <EuiPanel className="canvasAssetManager__asset" paddingSize="s">
        <div className="canvasAssetManager__thumb canvasCheckered">
          <EuiImage
            className="canvasAssetManager__img"
            size="original"
            url={asset.value}
            fullScreenIconColor="dark"
            alt="Asset thumbnail"
            style={{ backgroundImage: `url(${asset.value})` }}
          />
        </div>

        <EuiSpacer size="s" />

        <EuiText size="xs" className="eui-textBreakAll">
          <p className="eui-textBreakAll">
            <strong>{asset.id}</strong>
            <br />
            <EuiTextColor color="subdued">
              <small>({Math.round(asset.value.length / 1024)} kb)</small>
            </EuiTextColor>
          </p>
        </EuiText>

        <EuiSpacer size="s" />

        <EuiFlexGroup alignItems="baseline" justifyContent="center" responsive={false}>
          <EuiFlexItem className="asset-create-image" grow={false}>
            <EuiToolTip content="Create image element">
              <EuiButtonIcon
                iconType="vector"
                aria-label="Create image element"
                onClick={() => {
                  this.addElement(asset.id);
                  this.closeModal();
                }}
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem className="asset-download" grow={false}>
            <EuiToolTip content="Download">
              <Download fileName={asset.id} content={asset.value}>
                <EuiButtonIcon iconType="sortDown" aria-label="Download" />
              </Download>
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content="Copy id to clipboard">
              <Clipboard
                content={asset.id}
                onCopy={result => result && this.props.copyAsset(asset.id)}
              >
                <EuiButtonIcon iconType="copyClipboard" aria-label="Copy id to clipboard" />
              </Clipboard>
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content="Delete">
              <EuiButtonIcon
                color="danger"
                iconType="trash"
                aria-label="Delete"
                onClick={() => this.setState({ deleteId: asset.id })}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
  );

  render() {
    const { isModalVisible, loading } = this.state;
    const { assets } = this.props;

    const assetMaxLimit = 25000;

    const assetsTotal = Math.round(
      assets.reduce((total, asset) => total + asset.value.length, 0) / 1024
    );

    const percentageUsed = Math.round((assetsTotal / assetMaxLimit) * 100);

    const emptyAssets = (
      <EuiPanel className="canvasAssetManager__emptyPanel">
        <EuiEmptyPrompt
          iconType="importAction"
          title={<h2>No available assets</h2>}
          titleSize="s"
          body={
            <Fragment>
              <p>Upload your assets above to get started</p>
            </Fragment>
          }
        />
      </EuiPanel>
    );

    const assetModal = isModalVisible ? (
      <EuiOverlayMask>
        <EuiModal
          onClose={this.closeModal}
          className="canvasAssetManager canvasModal--fixedSize"
          maxWidth="1000px"
        >
          <EuiModalHeader className="canvasAssetManager__modalHeader">
            <EuiModalHeaderTitle className="canvasAssetManager__modalHeaderTitle">
              Manage workpad assets
            </EuiModalHeaderTitle>
            <EuiFlexGroup className="canvasAssetManager__fileUploadWrapper">
              <EuiFlexItem grow={false}>
                {loading ? (
                  <Loading animated text="Uploading images" />
                ) : (
                  <EuiFilePicker
                    initialPromptText="Select or drag and drop images"
                    compressed
                    multiple
                    onChange={this.handleFileUpload}
                    accept="image/*"
                  />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText size="s" color="subdued">
              <p>
                Below are the image assets that you added to this workpad. To reclaim space, delete
                assets that you no longer need. Unfortunately, any assets that are actually in use
                cannot be determined at this time.
              </p>
            </EuiText>
            <EuiSpacer />
            {assets.length ? (
              <EuiFlexGrid responsive={false} columns={4}>
                {assets.map(this.renderAsset)}
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
                  max={assetMaxLimit}
                  color={percentageUsed < 90 ? 'secondary' : 'danger'}
                  size="s"
                  aria-labelledby="CanvasAssetManagerLabel"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false} className="eui-textNoWrap">
                <EuiText id="CanvasAssetManagerLabel">{percentageUsed}% space used</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiButton size="s" onClick={this.closeModal}>
              Close
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      </EuiOverlayMask>
    ) : null;

    return (
      <Fragment>
        <EuiButtonEmpty size="s" onClick={this.showModal}>
          Manage assets
        </EuiButtonEmpty>

        {assetModal}

        <ConfirmModal
          isOpen={this.state.deleteId != null}
          title="Remove Asset"
          message="Are you sure you want to remove this asset?"
          confirmButtonText="Remove"
          onConfirm={this.doDelete}
          onCancel={this.resetDelete}
        />
      </Fragment>
    );
  }
}
