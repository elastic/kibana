/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { Fragment, PureComponent } from 'react';

import { ComponentStrings } from '../../../i18n';

import { ConfirmModal } from '../confirm_modal';
import { AssetType } from '../../../types';
import { AssetModal } from './asset_modal';

const { AssetManager: strings } = ComponentStrings;

export interface Props {
  /** A list of assets, if available */
  assetValues: AssetType[];
  /** Function to invoke when an asset is selected to be added as an element to the workpad */
  onAddImageElement: (id: string) => void;
  /** Function to invoke when an asset is deleted */
  onAssetDelete: (id: string | null) => void;
  /** Function to invoke when an asset is copied */
  onAssetCopy: () => void;
  /** Function to invoke when an asset is added */
  onAssetAdd: (asset: File) => void;
  /** Function to invoke when an asset modal is closed */
  onClose: () => void;
}

interface State {
  /** The id of the asset to delete, if applicable.  Is set if the viewer clicks the delete icon */
  deleteId: string | null;
  /** Indicates if the modal is currently loading */
  isLoading: boolean;
}

export class AssetManager extends PureComponent<Props, State> {
  public static propTypes = {
    assetValues: PropTypes.array,
    onAddImageElement: PropTypes.func.isRequired,
    onAssetAdd: PropTypes.func.isRequired,
    onAssetCopy: PropTypes.func.isRequired,
    onAssetDelete: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
  };

  public static defaultProps = {
    assetValues: [],
  };

  public state = {
    deleteId: null,
    isLoading: false,
  };

  public render() {
    const { isLoading } = this.state;
    const { assetValues, onAssetCopy, onAddImageElement, onClose } = this.props;

    const assetModal = (
      <AssetModal
        assetValues={assetValues}
        isLoading={isLoading}
        onAssetCopy={onAssetCopy}
        onAssetCreate={(createdAsset: AssetType) => {
          onAddImageElement(createdAsset.id);
          onClose();
        }}
        onAssetDelete={(asset: AssetType) => this.setState({ deleteId: asset.id })}
        onClose={onClose}
        onFileUpload={this.handleFileUpload}
      />
    );

    const confirmModal = (
      <ConfirmModal
        isOpen={this.state.deleteId !== null}
        title={strings.getConfirmModalTitle()}
        message={strings.getConfirmModalMessageText()}
        confirmButtonText={strings.getConfirmModalButtonLabel()}
        onConfirm={this.doDelete}
        onCancel={this.resetDelete}
      />
    );

    return (
      <Fragment>
        {assetModal}
        {confirmModal}
      </Fragment>
    );
  }

  private resetDelete = () => this.setState({ deleteId: null });

  private doDelete = () => {
    this.resetDelete();
    this.props.onAssetDelete(this.state.deleteId);
  };

  private handleFileUpload = (files: FileList | null) => {
    if (files == null) return;
    this.setState({ isLoading: true });
    Promise.all(Array.from(files).map((file) => this.props.onAssetAdd(file))).finally(() => {
      this.setState({ isLoading: false });
    });
  };
}
