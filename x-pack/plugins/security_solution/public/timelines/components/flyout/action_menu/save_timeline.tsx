/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { SaveTimelineButton } from '../../timeline/header/save_timeline_button';

interface SaveTimelineActionProps {
  timelineId: string;
}

export const SaveTimelineAction = ({ timelineId }: SaveTimelineActionProps) => {
  const {
    kibanaSecuritySolutionsPrivileges: { crud: hasKibanaCrud },
  } = useUserPrivileges();

  return <SaveTimelineButton timelineId={timelineId} />;
};
