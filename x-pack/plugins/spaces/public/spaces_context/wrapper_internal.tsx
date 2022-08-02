/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { useEffect, useMemo, useState } from 'react';

import type { ApplicationStart, DocLinksStart, NotificationsStart } from '@kbn/core/public';

import type { GetAllSpacesPurpose } from '../../common';
import type { SpacesManager } from '../spaces_manager';
import type { SpacesData, SpacesDataEntry } from '../types';
import { createSpacesReactContext } from './context';
import type { InternalProps, SpacesContextProps, SpacesReactContext } from './types';

interface Services {
  application: ApplicationStart;
  docLinks: DocLinksStart;
  notifications: NotificationsStart;
}

async function getSpacesData(spacesManager: SpacesManager, feature?: string): Promise<SpacesData> {
  const spaces = await spacesManager.getSpaces({ includeAuthorizedPurposes: true });
  const activeSpace = await spacesManager.getActiveSpace();
  const spacesMap = spaces
    .map<SpacesDataEntry>(({ authorizedPurposes, disabledFeatures, ...space }) => {
      const isActiveSpace = space.id === activeSpace.id;
      const isFeatureDisabled = feature !== undefined && disabledFeatures.includes(feature);
      return {
        ...space,
        ...(isActiveSpace && { isActiveSpace }),
        ...(isFeatureDisabled && { isFeatureDisabled }),
        isAuthorizedForPurpose: (purpose: GetAllSpacesPurpose) =>
          // If authorizedPurposes is not present, then Security is disabled; normally in a situation like this we would "fail-secure", but
          // in this case we are dealing with an abstraction over the client-side UI capabilities. There is no chance for privilege
          // escalation here, and the correct behavior is that if Security is disabled, the user is implicitly authorized to do everything.
          authorizedPurposes ? authorizedPurposes[purpose] === true : true,
      };
    })
    .reduce((acc, cur) => acc.set(cur.id, cur), new Map<string, SpacesDataEntry>());

  return {
    spacesMap,
    activeSpaceId: activeSpace.id,
  };
}

export const SpacesContextWrapperInternal = (
  props: PropsWithChildren<InternalProps & SpacesContextProps>
) => {
  const { spacesManager, getStartServices, feature, children } = props;

  const [context, setContext] = useState<SpacesReactContext<Services> | undefined>();
  const spacesDataPromise = useMemo(
    () => getSpacesData(spacesManager, feature),
    [spacesManager, feature]
  );

  useEffect(() => {
    getStartServices().then(([coreStart]) => {
      const { application, docLinks, notifications } = coreStart;
      const services = { application, docLinks, notifications };
      setContext(createSpacesReactContext(services, spacesManager, spacesDataPromise));
    });
  }, [getStartServices, spacesDataPromise, spacesManager]);

  if (!context) {
    return null;
  }

  return <context.Provider>{children}</context.Provider>;
};
