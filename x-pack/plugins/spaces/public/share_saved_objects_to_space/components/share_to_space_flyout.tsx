/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { StartServicesAccessor } from 'src/core/public';
import type { ShareToSpaceFlyoutProps } from '../../../../../../src/plugins/spaces_oss/public';
import { PluginsStart } from '../../plugin';
import { SpacesManager } from '../../spaces_manager';
import { ContextWrapper } from './context_wrapper';
import { ShareToSpaceFlyoutInternal } from './share_to_space_flyout_internal';

const ShareToSpaceFlyout: FC<GetShareToSpaceFlyoutOptions & ShareToSpaceFlyoutProps> = ({
  spacesManager,
  getStartServices,
  ...props
}) => {
  return (
    <ContextWrapper getStartServices={getStartServices}>
      <ShareToSpaceFlyoutInternal spacesManager={spacesManager} {...props} />
    </ContextWrapper>
  );
};

interface GetShareToSpaceFlyoutOptions {
  spacesManager: SpacesManager;
  getStartServices: StartServicesAccessor<PluginsStart>;
}

export const getShareToSpaceFlyoutComponent = (
  options: GetShareToSpaceFlyoutOptions
): FC<ShareToSpaceFlyoutProps> => {
  return (props: ShareToSpaceFlyoutProps) => {
    return <ShareToSpaceFlyout {...options} {...props} />;
  };
};
