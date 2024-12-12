/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useEffect, useState } from 'react';
import type { Capabilities } from '@kbn/core/types';
import { SECURITY_FEATURE_ID } from '../../../../common/constants';
import { useFetchListPrivileges } from '../../../detections/components/user_privileges/use_fetch_list_privileges';
import { useFetchDetectionEnginePrivileges } from '../../../detections/components/user_privileges/use_fetch_detection_engine_privileges';
import { getEndpointPrivilegesInitialState, useEndpointPrivileges } from './endpoint';
import type { EndpointPrivileges } from '../../../../common/endpoint/types';
import { extractTimelineCapabilities } from '../../utils/timeline_capabilities';
import { extractNotesCapabilities } from '../../utils/notes_capabilities';

export interface UserPrivilegesState {
  listPrivileges: ReturnType<typeof useFetchListPrivileges>;
  detectionEnginePrivileges: ReturnType<typeof useFetchDetectionEnginePrivileges>;
  endpointPrivileges: EndpointPrivileges;
  kibanaSecuritySolutionsPrivileges: { crud: boolean; read: boolean };
  timelinePrivileges: { crud: boolean; read: boolean };
  notesPrivileges: { crud: boolean; read: boolean };
}

export const initialUserPrivilegesState = (): UserPrivilegesState => ({
  listPrivileges: { loading: false, error: undefined, result: undefined },
  detectionEnginePrivileges: { loading: false, error: undefined, result: undefined },
  endpointPrivileges: getEndpointPrivilegesInitialState(),
  kibanaSecuritySolutionsPrivileges: { crud: false, read: false },
  timelinePrivileges: { crud: false, read: false },
  notesPrivileges: { crud: false, read: false },
});
export const UserPrivilegesContext = createContext<UserPrivilegesState>(
  initialUserPrivilegesState()
);

interface UserPrivilegesProviderProps {
  kibanaCapabilities: Capabilities;
  children: React.ReactNode;
}

export const UserPrivilegesProvider = ({
  kibanaCapabilities,
  children,
}: UserPrivilegesProviderProps) => {
  const crud: boolean = kibanaCapabilities[SECURITY_FEATURE_ID].crud === true;
  const read: boolean = kibanaCapabilities[SECURITY_FEATURE_ID].show === true;
  const [kibanaSecuritySolutionsPrivileges, setKibanaSecuritySolutionsPrivileges] = useState({
    crud,
    read,
  });

  const listPrivileges = useFetchListPrivileges(read);
  const detectionEnginePrivileges = useFetchDetectionEnginePrivileges(read);
  const endpointPrivileges = useEndpointPrivileges();

  const [timelinePrivileges, setTimelinePrivileges] = useState(
    extractTimelineCapabilities(kibanaCapabilities)
  );
  const [notesPrivileges, setNotesPrivileges] = useState(
    extractNotesCapabilities(kibanaCapabilities)
  );

  useEffect(() => {
    setNotesPrivileges((currPrivileges) => {
      const { read: notesRead, crud: notesCrud } = extractNotesCapabilities(kibanaCapabilities);
      if (currPrivileges.read !== notesRead || currPrivileges.crud !== notesCrud) {
        return { read: notesRead, crud: notesCrud };
      }
      return currPrivileges;
    });
  }, [kibanaCapabilities]);

  useEffect(() => {
    setTimelinePrivileges((currPrivileges) => {
      const { read: timelineRead, crud: timelineCrud } =
        extractTimelineCapabilities(kibanaCapabilities);
      if (currPrivileges.read !== timelineRead || currPrivileges.crud !== timelineCrud) {
        return { read: timelineRead, crud: timelineCrud };
      }
      return currPrivileges;
    });
  }, [kibanaCapabilities]);

  useEffect(() => {
    setKibanaSecuritySolutionsPrivileges((currPrivileges) => {
      if (currPrivileges.read !== read || currPrivileges.crud !== crud) {
        return { read, crud };
      }
      return currPrivileges;
    });
  }, [crud, read]);

  return (
    <UserPrivilegesContext.Provider
      value={{
        listPrivileges,
        detectionEnginePrivileges,
        endpointPrivileges,
        kibanaSecuritySolutionsPrivileges,
        timelinePrivileges,
        notesPrivileges,
      }}
    >
      {children}
    </UserPrivilegesContext.Provider>
  );
};
