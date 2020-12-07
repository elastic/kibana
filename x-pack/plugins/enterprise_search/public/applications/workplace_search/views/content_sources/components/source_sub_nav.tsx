/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues } from 'kea';

import { AppLogic } from '../../../app_logic';
import { NAV, CUSTOM_SERVICE_TYPE } from '../../../constants';

import { SourceLogic } from '../source_logic';

import { SideNavLink } from '../../../../shared/layout';

import {
  getContentSourcePath,
  SOURCE_DETAILS_PATH,
  SOURCE_CONTENT_PATH,
  SOURCE_SCHEMAS_PATH,
  SOURCE_DISPLAY_SETTINGS_PATH,
  SOURCE_SETTINGS_PATH,
} from '../../../routes';

export const SourceSubNav: React.FC = () => {
  const { isOrganization } = useValues(AppLogic);
  const {
    contentSource: { id, serviceType },
  } = useValues(SourceLogic);

  if (!id) return null;

  const isCustom = serviceType === CUSTOM_SERVICE_TYPE;

  return (
    <>
      <SideNavLink to={getContentSourcePath(SOURCE_DETAILS_PATH, id, isOrganization)}>
        {NAV.OVERVIEW}
      </SideNavLink>
      <SideNavLink to={getContentSourcePath(SOURCE_CONTENT_PATH, id, isOrganization)}>
        {NAV.CONTENT}
      </SideNavLink>
      {isCustom && (
        <>
          <SideNavLink to={getContentSourcePath(SOURCE_SCHEMAS_PATH, id, isOrganization)}>
            {NAV.SCHEMA}
          </SideNavLink>
          <SideNavLink to={getContentSourcePath(SOURCE_DISPLAY_SETTINGS_PATH, id, isOrganization)}>
            {NAV.DISPLAY_SETTINGS}
          </SideNavLink>
        </>
      )}
      <SideNavLink to={getContentSourcePath(SOURCE_SETTINGS_PATH, id, isOrganization)}>
        {NAV.SETTINGS}
      </SideNavLink>
    </>
  );
};
