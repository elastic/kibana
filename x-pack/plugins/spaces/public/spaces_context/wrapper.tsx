/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, PropsWithChildren, useMemo } from 'react';
import { StartServicesAccessor, CoreStart } from 'src/core/public';
import type { SpacesContextProps } from '../../../../../src/plugins/spaces_oss/public';
import { createSpacesReactContext } from './context';
import { PluginsStart } from '../plugin';
import { SpacesManager } from '../spaces_manager';
import { SpacesData, SpaceData } from '../types';

interface InternalProps {
  spacesManager: SpacesManager;
  getStartServices: StartServicesAccessor<PluginsStart>;
}

async function getSpacesData(spacesManager: SpacesManager, feature?: string): Promise<SpacesData> {
  const spaces = await spacesManager.getSpaces({ includeAuthorizedPurposes: true });
  const activeSpace = await spacesManager.getActiveSpace();
  const spacesMap = spaces
    .map<SpaceData>(({ authorizedPurposes, disabledFeatures, ...space }) => {
      const isActiveSpace = space.id === activeSpace.id;
      const isPartiallyAuthorized = authorizedPurposes?.shareSavedObjectsIntoSpace === false;
      const isFeatureDisabled = feature && disabledFeatures.includes(feature);
      return {
        ...space,
        ...(isActiveSpace && { isActiveSpace }),
        ...(isPartiallyAuthorized && { isPartiallyAuthorized }),
        ...(isFeatureDisabled && { isFeatureDisabled }),
      };
    })
    .reduce((acc, cur) => acc.set(cur.id, cur), new Map<string, SpaceData>());

  return {
    spacesMap,
    activeSpaceId: activeSpace.id,
  };
}

const SpacesContextWrapper = (props: PropsWithChildren<InternalProps & SpacesContextProps>) => {
  const { spacesManager, getStartServices, feature, children } = props;

  const [coreStart, setCoreStart] = useState<CoreStart>();
  const spacesDataPromise = useMemo(() => getSpacesData(spacesManager, feature), [
    spacesManager,
    feature,
  ]);

  useEffect(() => {
    getStartServices().then(([coreStartValue]) => {
      setCoreStart(coreStartValue);
    });
  }, [getStartServices]);

  if (!coreStart) {
    return null;
  }

  const { application, docLinks, notifications } = coreStart;
  const services = { application, docLinks, notifications };
  const context = createSpacesReactContext(services, spacesManager, spacesDataPromise);

  return <context.Provider>{children}</context.Provider>;
};

export const getSpacesContextWrapper = (
  internalProps: InternalProps
): React.FC<SpacesContextProps> => {
  return ({ children, ...props }: PropsWithChildren<SpacesContextProps>) => {
    return <SpacesContextWrapper {...{ ...internalProps, ...props, children }} />;
  };
};
