/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import React, { useState } from 'react';
import { FilePicker } from '@kbn/files-plugin/public';
import { ImageConfig } from '../types';
import { imageEmbeddableFileKind } from '../../common';
import { ImageViewer } from '../image_viewer';

export interface ImageEditorFlyoutProps {
  onCancel: () => void;
  onSave: (imageConfigWithReferences: ImageConfig) => void;
  initialImageConfig?: ImageConfig;
}

export function ImageEditorFlyout(props: ImageEditorFlyoutProps) {
  const [fileId, setFileId] = useState('');

  const onSave = () => {
    props.onSave({
      ...props.initialImageConfig,
      src: {
        type: 'file',
        fileId,
      },
    });
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder={true}>
        <EuiTitle size="m">
          <h2>Flyout header</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <ImageViewer
          src={{
            type: 'file',
            fileId,
          }}
        />
        <FilePickerButton onFilePicked={(file) => setFileId(file.fileId)} />
        {/* <EuiFieldText*/}
        {/*  placeholder="Image src"*/}
        {/*  value={src}*/}
        {/*  onChange={(e) => setSrc(e.target.value)}*/}
        {/*  aria-label="Image src"*/}
        {/* />*/}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={props.onCancel} flush="left">
              Close
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onSave} fill>
              Save
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
}

function FilePickerButton(props: { onFilePicked: (file: { fileId: string }) => void }) {
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  return (
    <>
      {isDialogOpen && (
        <FilePicker
          kind={imageEmbeddableFileKind.id}
          onClose={() => {
            setIsDialogOpen(false);
          }}
          onDone={(fileIds) => {
            props.onFilePicked({ fileId: fileIds[0] });
            setIsDialogOpen(false);
          }}
        />
      )}

      <EuiButton
        onClick={() => {
          setIsDialogOpen(true);
        }}
      >
        Select a file
      </EuiButton>
    </>
  );
}
