/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';

import { i18n } from '@kbn/i18n';
import type { SpacesPluginStart, ShareToSpaceFlyoutProps } from '@kbn/spaces-plugin/public';
import { tagSavedObjectTypeName } from '../../../common/constants';

interface Props {
  spacesApi: SpacesPluginStart;
  canShareIntoSpace: boolean;
  spaceIds: string[];
  id: string;
  title: string;
  refresh(): void;
}

const noun = i18n.translate('indexPatternManagement.indexPatternTable.savedObjectName', {
  defaultMessage: 'data view',
});

export const SpacesList: FC<Props> = ({
  spacesApi,
  canShareIntoSpace,
  spaceIds,
  id,
  title,
  refresh,
}) => {
  const [showFlyout, setShowFlyout] = useState(false);

  function onClose() {
    setShowFlyout(false);
  }

  const LazySpaceList = spacesApi.ui.components.getSpaceList;
  const LazyShareToSpaceFlyout = spacesApi.ui.components.getShareToSpaceFlyout;

  const shareToSpaceFlyoutProps: ShareToSpaceFlyoutProps = {
    savedObjectTarget: {
      type: tagSavedObjectTypeName,
      namespaces: spaceIds,
      id,
      title,
      noun,
    },
    onUpdate: refresh,
    onClose,
  };

  const clickProperties = canShareIntoSpace
    ? { cursorStyle: 'pointer', listOnClick: () => setShowFlyout(true) }
    : { cursorStyle: 'not-allowed' };
  return (
    <>
      <LazySpaceList
        namespaces={spaceIds}
        displayLimit={8}
        behaviorContext="outside-space"
        {...clickProperties}
      />
      {showFlyout && <LazyShareToSpaceFlyout {...shareToSpaceFlyoutProps} />}
    </>
  );
};
