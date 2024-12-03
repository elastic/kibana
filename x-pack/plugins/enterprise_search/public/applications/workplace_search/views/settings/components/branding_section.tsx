/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';

import {
  EuiButton,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFilePicker,
  EuiText,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';

import {
  SAVE_BUTTON_LABEL,
  CANCEL_BUTTON_LABEL,
  RESET_DEFAULT_BUTTON_LABEL,
} from '../../../../shared/constants';
import { readUploadedFileAsBase64 } from '../../../utils';

import {
  LOGO_TEXT,
  ICON_TEXT,
  RESET_IMAGE_TITLE,
  RESET_LOGO_DESCRIPTION,
  RESET_ICON_DESCRIPTION,
  RESET_IMAGE_CONFIRMATION_TEXT,
  ORGANIZATION_LABEL,
  BRAND_TEXT,
} from '../constants';

export const defaultLogo =
  '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';
const defaultIcon =
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAA/1BMVEUAAADwTpj+xRT+xRTwTpjwTpj+xRTwTpj+wxT+xRT/yBMSHkn8yxL+wxX+xRT+xRT/1QwzN0E6OkH/xxPwTpjwTpjwTpj/xBQsMUPwTpj/UK3/yRMWHkvwTpj/zg7wTpj/0A3wTpjwTpgRIEf/0Qx/P2P/yBMuM0I1OEH+xRQuM0L+xRQuM0LntRr+xRT+xRT+xBQ1JlZjPVdaUDwtMEUbJkYbJEj+xRTwTpg0N0E2N0LuTZX/U6z/Uqf9UaFkPVYRMjD/UqnzTpgKMS0BMCn/UaL3T53gTJGwRn2jRHRdPFUtNj4qNjwmNToALyfKSojISoeJQWhtPlsFKTP/yxKq4k7GAAAAN3RSTlMA29vt7fPy6uPQdjYd/aSVBfHs49nPwq+nlIuEU084MichEAoK/vPXz6iempOSjn9kY1w0LBcVaxnnyQAAASFJREFUOMuVk3lbgkAQh6cIxQq0u6zM7vs+cHchRbE7O7//Z+nng60PDuDj+9/MvMCyM0O0YE4Ac35lkzTTp3M5A+QKCPK1HuY69bjY+3UjDERjNc1GVD9zNeNxIb+FeOfYZYJmEXHFzhBUGYnVdEHde1fILHFB1+uNG5zCYoKuh2L2jqhqJwnqwfsOpRQHyE0mCU3vqyOkEOIESYsLyv9svUoB5BRewYVm8NJCvcsymsGF9uP7m4iY2SYqMMF/aoh/8I1DLjz3hTWi4ogC/4Qz9JCj/6byP7IvCle925Fd4yj5qtGsoB7C2I83i7f7Fiew0wfm55qoZKWOXDu4zBo5UMbz50PGvop85uKUigMCXz0nJrDlja2OQcnrX3H0+v8BzVCfXpvPH1sAAAAASUVORK5CYII=';

interface Props {
  imageType: 'logo' | 'icon';
  description: string;
  helpText: string;
  image?: string | null;
  stagedImage?: string | null;
  buttonLoading: boolean;
  stageImage(image: string | null): void;
  saveImage(): void;
  resetImage(): void;
}

export const BrandingSection: React.FC<Props> = ({
  imageType,
  description,
  helpText,
  image,
  stagedImage,
  buttonLoading,
  stageImage,
  saveImage,
  resetImage,
}) => {
  const [resetConfirmModalVisible, setVisible] = useState(false);
  const [imageUploadKey, setKey] = useState(1);
  const showDeleteModal = () => setVisible(true);
  const closeDeleteModal = () => setVisible(false);
  const isLogo = imageType === 'logo';
  const imageText = isLogo ? LOGO_TEXT : ICON_TEXT;
  const defaultImage = isLogo ? defaultLogo : defaultIcon;
  const confirmationTitleId = useGeneratedHtmlId();

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length < 1) {
      return stageImage(null);
    }
    const file = files[0];
    const img = await readUploadedFileAsBase64(file);
    stageImage(img);
  };

  const resetConfirmModal = (
    <EuiConfirmModal
      title={RESET_IMAGE_TITLE}
      titleProps={{ id: confirmationTitleId }}
      onCancel={closeDeleteModal}
      onConfirm={() => {
        resetImage();
        closeDeleteModal();
      }}
      cancelButtonText={CANCEL_BUTTON_LABEL}
      confirmButtonText={RESET_DEFAULT_BUTTON_LABEL}
      buttonColor="danger"
      defaultFocusedButton="confirm"
      aria-labelledby={confirmationTitleId}
    >
      <>
        <p>{isLogo ? RESET_LOGO_DESCRIPTION : RESET_ICON_DESCRIPTION}</p>
        <p>{RESET_IMAGE_CONFIRMATION_TEXT}</p>
      </>
    </EuiConfirmModal>
  );

  // EUI currently does not support clearing an upload input programatically, so we can render a new
  // one each time the image is changed.
  useEffect(() => {
    setKey(imageUploadKey + 1);
  }, [image]);

  return (
    <>
      <EuiFormRow
        label={`${ORGANIZATION_LABEL} ${imageText}`}
        helpText={helpText}
        labelAppend={
          <EuiText color="subdued" size="xs">
            {description}
          </EuiText>
        }
      >
        <>
          <EuiSpacer size="m" />
          <img
            src={`data:image/png;base64,${image || defaultImage}`}
            alt={`${BRAND_TEXT} ${imageType}`}
            height={32} // Same as icon and logo height in the Search experience
          />
          <EuiSpacer size="m" />
          <EuiFilePicker
            key={imageType + imageUploadKey}
            accept="image/png"
            onChange={handleUpload}
          />
        </>
      </EuiFormRow>
      <EuiFormRow>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="enterpriseSearchBrandingSectionButton"
              isLoading={buttonLoading}
              disabled={!stagedImage}
              color="primary"
              onClick={saveImage}
            >
              {SAVE_BUTTON_LABEL}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {image && (
              <EuiButton color="danger" onClick={showDeleteModal} data-test-subj="ResetImageButton">
                {RESET_DEFAULT_BUTTON_LABEL}
              </EuiButton>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      {resetConfirmModalVisible && resetConfirmModal}
    </>
  );
};
