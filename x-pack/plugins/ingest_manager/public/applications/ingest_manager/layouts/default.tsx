/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiPage, EuiPageBody, EuiTabs, EuiTab } from '@elastic/eui';
import { Section } from '../sections';
import { useLink, useConfig } from '../hooks';
import { EPM_PATH, FLEET_PATH } from '../constants';

interface Props {
  section: Section;
  children?: React.ReactNode;
}

export const DefaultLayout: React.FC<Props> = ({ section, children }) => {
  const { epm, fleet } = useConfig();

  return (
    <div>
      <EuiTabs display="condensed">
        <EuiTab isSelected={!section || section === 'overview'} href={useLink()}>
          Overview
        </EuiTab>
        <EuiTab isSelected={section === 'epm'} href={useLink(EPM_PATH)} disabled={!epm?.enabled}>
          Packages
        </EuiTab>
        <EuiTab
          isSelected={section === 'fleet'}
          href={useLink(FLEET_PATH)}
          disabled={!fleet?.enabled}
        >
          Fleet
        </EuiTab>
      </EuiTabs>
      <EuiPage>
        <EuiPageBody>{children}</EuiPageBody>
      </EuiPage>
    </div>
  );
};
