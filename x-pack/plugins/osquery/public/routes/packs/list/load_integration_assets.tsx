/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButton, EuiButtonProps } from '@elastic/eui';
import { useImportAssets } from '../../../assets/use_import_assets';
import { useAssetsStatus } from '../../../assets/use_assets_status';
import {
  LOAD_PREBUILT_PACKS_BUTTON,
  UPDATE_PREBUILT_PACKS_BUTTON,
  LOAD_PREBUILT_PACKS_SUCCESS_TEXT,
  UPDATE_PREBUILT_PACKS_SUCCESS_TEXT,
} from './translations';

interface LoadIntegrationAssetsButtonProps {
  fill?: EuiButtonProps['fill'];
}

const LoadIntegrationAssetsButtonComponent: React.FC<LoadIntegrationAssetsButtonProps> = ({
  fill,
}) => {
  const { data } = useAssetsStatus();
  const { isLoading, mutateAsync } = useImportAssets({
    successToastText: data?.upToDate?.length
      ? UPDATE_PREBUILT_PACKS_SUCCESS_TEXT
      : LOAD_PREBUILT_PACKS_SUCCESS_TEXT,
  });

  const handleClick = useCallback(() => mutateAsync(), [mutateAsync]);

  if (data?.install.length || data?.update.length) {
    return (
      <EuiButton fill={!!fill} isLoading={isLoading} onClick={handleClick} iconType="plusInCircle">
        {data?.upToDate?.length ? UPDATE_PREBUILT_PACKS_BUTTON : LOAD_PREBUILT_PACKS_BUTTON}
      </EuiButton>
    );
  }

  return null;
};

export const LoadIntegrationAssetsButton = React.memo(LoadIntegrationAssetsButtonComponent);
