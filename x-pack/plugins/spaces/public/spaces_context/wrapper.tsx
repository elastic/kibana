/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, PropsWithChildren, useMemo } from 'react';
import {
  StartServicesAccessor,
  DocLinksStart,
  ApplicationStart,
  NotificationsStart,
} from 'src/core/public';
import type { SpacesContextProps } from '../../../../../src/plugins/spaces_oss/public';
import { createSpacesReactContext } from './context';
import { PluginsStart } from '../plugin';
import { SpacesManager } from '../spaces_manager';
import { ShareToSpacesData, ShareToSpaceTarget } from '../types';
import { SpacesReactContext } from './types';

interface InternalProps {
  spacesManager: SpacesManager;
  getStartServices: StartServicesAccessor<PluginsStart>;
}

interface Services {
  application: ApplicationStart;
  docLinks: DocLinksStart;
  notifications: NotificationsStart;
}

async function getShareToSpacesData(
  spacesManager: SpacesManager,
  feature?: string
): Promise<ShareToSpacesData> {
  const spaces = await spacesManager.getSpaces({ includeAuthorizedPurposes: true });
  const activeSpace = await spacesManager.getActiveSpace();
  const spacesMap = spaces
    .map<ShareToSpaceTarget>(({ authorizedPurposes, disabledFeatures, ...space }) => {
      const isActiveSpace = space.id === activeSpace.id;
      const cannotShareToSpace = authorizedPurposes?.shareSavedObjectsIntoSpace === false;
      const isFeatureDisabled = feature !== undefined && disabledFeatures.includes(feature);
      return {
        ...space,
        ...(isActiveSpace && { isActiveSpace }),
        ...(cannotShareToSpace && { cannotShareToSpace }),
        ...(isFeatureDisabled && { isFeatureDisabled }),
      };
    })
    .reduce((acc, cur) => acc.set(cur.id, cur), new Map<string, ShareToSpaceTarget>());

  return {
    spacesMap,
    activeSpaceId: activeSpace.id,
  };
}

const SpacesContextWrapper = (props: PropsWithChildren<InternalProps & SpacesContextProps>) => {
  const { spacesManager, getStartServices, feature, children } = props;

  const [context, setContext] = useState<SpacesReactContext<Services> | undefined>();
  const shareToSpacesDataPromise = useMemo(() => getShareToSpacesData(spacesManager, feature), [
    spacesManager,
    feature,
  ]);

  useEffect(() => {
    getStartServices().then(([coreStart]) => {
      const { application, docLinks, notifications } = coreStart;
      const services = { application, docLinks, notifications };
      setContext(createSpacesReactContext(services, spacesManager, shareToSpacesDataPromise));
    });
  }, [getStartServices, shareToSpacesDataPromise, spacesManager]);

  if (!context) {
    return null;
  }

  return <context.Provider>{children}</context.Provider>;
};

export const getSpacesContextWrapper = (
  internalProps: InternalProps
): React.FC<SpacesContextProps> => {
  return ({ children, ...props }: PropsWithChildren<SpacesContextProps>) => {
    return <SpacesContextWrapper {...{ ...internalProps, ...props, children }} />;
  };
};
