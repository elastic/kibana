/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiCallOut, EuiEmptyPrompt, EuiSpacer, EuiPanel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { LicensingLogic } from '../../../shared/licensing';
import { EuiButtonTo } from '../../../shared/react_router_helpers';
import { AppLogic } from '../../app_logic';
import noOrgSourcesIcon from '../../assets/share_circle.svg';
import { PersonalDashboardLayout } from '../../components/layout';
import { ContentSection } from '../../components/shared/content_section';
import { SourcesTable } from '../../components/shared/sources_table';
import { NAV } from '../../constants';
import { ADD_SOURCE_PATH, getSourcesPath } from '../../routes';
import { toSentenceSerial } from '../../utils';

import {
  PRIVATE_LINK_TITLE,
  PRIVATE_HEADER_TITLE,
  PRIVATE_HEADER_DESCRIPTION,
  PRIVATE_ORG_SOURCES_TITLE,
  PRIVATE_EMPTY_TITLE,
  ORG_SOURCES_EMPTY_TITLE,
  ORG_SOURCES_EMPTY_DESCRIPTION,
  LICENSE_CALLOUT_TITLE,
  LICENSE_CALLOUT_DESCRIPTION,
} from './constants';
import { SourcesLogic } from './sources_logic';
import { SourcesView } from './sources_view';

export const PrivateSources: React.FC = () => {
  const { hasPlatinumLicense } = useValues(LicensingLogic);
  const { initializeSources, setSourceSearchability, resetSourcesState } = useActions(SourcesLogic);

  useEffect(() => {
    initializeSources();
    return resetSourcesState;
  }, []);

  const { dataLoading, contentSources, serviceTypes, privateContentSources } =
    useValues(SourcesLogic);

  const {
    account: { canCreatePrivateSources, groups },
  } = useValues(AppLogic);

  const hasConfiguredConnectors = serviceTypes.some(({ configured }) => configured);
  const canAddSources = canCreatePrivateSources && hasConfiguredConnectors;
  const hasPrivateSources = privateContentSources?.length > 0;
  const hasOrgSources = contentSources.length > 0;

  const licenseCallout = (
    <>
      <EuiCallOut title={LICENSE_CALLOUT_TITLE} iconType="iInCircle">
        <p>{LICENSE_CALLOUT_DESCRIPTION}</p>
      </EuiCallOut>
      <EuiSpacer />
    </>
  );

  const headerAction = (
    <EuiButtonTo
      to={getSourcesPath(ADD_SOURCE_PATH, false)}
      fill
      color="primary"
      data-test-subj="AddSourceButton"
    >
      {PRIVATE_LINK_TITLE}
    </EuiButtonTo>
  );

  const privateSourcesEmptyState = (
    <EuiPanel hasShadow={false} color="subdued">
      <EuiSpacer size="xxl" />
      <EuiEmptyPrompt iconType="lock" title={<h2>{PRIVATE_EMPTY_TITLE}</h2>} />
      <EuiSpacer size="xxl" />
    </EuiPanel>
  );

  const privateSourcesTable = (
    <SourcesTable
      showDetails
      onSearchableToggle={setSourceSearchability}
      sources={privateContentSources}
    />
  );

  const privateSourcesSection = (
    <ContentSection
      isOrganization={false}
      title={PRIVATE_HEADER_TITLE}
      description={PRIVATE_HEADER_DESCRIPTION}
      action={canAddSources && headerAction}
    >
      {hasPrivateSources ? privateSourcesTable : privateSourcesEmptyState}
    </ContentSection>
  );

  const orgSourcesEmptyState = (
    <EuiPanel hasShadow={false} color="subdued">
      <EuiSpacer size="xxl" />
      <EuiEmptyPrompt
        iconType={noOrgSourcesIcon}
        title={<h2>{ORG_SOURCES_EMPTY_TITLE}</h2>}
        body={<p>{ORG_SOURCES_EMPTY_DESCRIPTION}</p>}
      />
      <EuiSpacer size="xxl" />
    </EuiPanel>
  );

  const orgSourcesTable = (
    <SourcesTable showDetails={false} isOrganization={false} sources={contentSources} />
  );

  const orgSourcesSection = (
    <ContentSection
      isOrganization={false}
      title={PRIVATE_ORG_SOURCES_TITLE}
      description={
        hasOrgSources && (
          <FormattedMessage
            id="xpack.enterpriseSearch.workplaceSearch.sources.private.privateOrg.header.description"
            defaultMessage="You have access to the following sources through {newline}the {groups, plural, one {group} other {groups}} {groupsSentence}."
            values={{
              groups: groups.length,
              groupsSentence: toSentenceSerial(groups),
              newline: <br />,
            }}
          />
        )
      }
    >
      {hasOrgSources ? orgSourcesTable : orgSourcesEmptyState}
    </ContentSection>
  );

  return (
    <PersonalDashboardLayout pageChrome={[NAV.SOURCES]} isLoading={dataLoading}>
      <SourcesView>
        {hasPrivateSources && !hasPlatinumLicense && licenseCallout}
        {canCreatePrivateSources && privateSourcesSection}
        {orgSourcesSection}
      </SourcesView>
    </PersonalDashboardLayout>
  );
};
