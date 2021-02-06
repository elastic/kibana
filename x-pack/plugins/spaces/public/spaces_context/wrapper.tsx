/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, PropsWithChildren, useMemo } from 'react';
import { StartServicesAccessor, CoreStart } from 'src/core/public';
import { createSpacesReactContext } from './context';
import { PluginsStart } from '../plugin';
import { SpacesManager } from '../spaces_manager';
import { SpaceTarget } from '../share_saved_objects_to_space/types';
import { getSpaceColor } from '../space_avatar';
import { SpacesData } from './types';

interface Props {
  spacesManager: SpacesManager;
  getStartServices: StartServicesAccessor<PluginsStart>;
}

async function getSpacesData(spacesManager: SpacesManager): Promise<SpacesData> {
  const spaces = await spacesManager.getSpaces({ includeAuthorizedPurposes: true });
  const activeSpace = await spacesManager.getActiveSpace();
  const spacesMap = spaces
    .map<SpaceTarget>(({ authorizedPurposes, ...space }) => {
      const isActiveSpace = space.id === activeSpace.id;
      const isPartiallyAuthorized = authorizedPurposes?.shareSavedObjectsIntoSpace === false;
      return {
        ...space,
        color: getSpaceColor(space),
        ...(isActiveSpace && { isActiveSpace }),
        ...(isPartiallyAuthorized && { isPartiallyAuthorized }),
      };
    })
    .reduce((acc, cur) => acc.set(cur.id, cur), new Map<string, SpaceTarget>());

  return {
    spacesMap,
    activeSpaceId: activeSpace.id,
  };
}

const SpacesContextWrapper = (props: PropsWithChildren<Props>) => {
  const { spacesManager, getStartServices, children } = props;

  const [coreStart, setCoreStart] = useState<CoreStart>();
  const spacesDataPromise = useMemo(() => getSpacesData(spacesManager), [spacesManager]);

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

export const getSpacesContextWrapper = (props: Props): React.FC => {
  return ({ children }) => {
    return <SpacesContextWrapper {...{ ...props, children }} />;
  };
};
