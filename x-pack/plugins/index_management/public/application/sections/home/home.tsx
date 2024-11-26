/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty, EuiPageHeader, EuiSpacer } from '@elastic/eui';

import { Section } from '../../../../common/constants';
import { documentationService } from '../../services/documentation';
import { ComponentTemplateList } from '../../components/component_templates';
import { useAppContext } from '../../app_context';
import { IndexList } from './index_list';
import { EnrichPoliciesList } from './enrich_policies_list';
import { IndexDetailsPage } from './index_list/details_page';
import { DataStreamList } from './data_stream_list';
import { TemplateList } from './template_list';

export const homeSections = [
  Section.Indices,
  Section.DataStreams,
  Section.IndexTemplates,
  Section.ComponentTemplates,
  Section.EnrichPolicies,
];

interface MatchParams {
  section: Section;
}

export const IndexManagementHome: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { section },
  },
  history,
}) => {
  const {
    plugins: { console: consolePlugin },
    core: { capabilities },
  } = useAppContext();
  const tabs = [
    {
      id: Section.Indices,
      name: <FormattedMessage id="xpack.idxMgmt.home.indicesTabTitle" defaultMessage="Indices" />,
    },
    {
      id: Section.DataStreams,
      name: (
        <FormattedMessage
          id="xpack.idxMgmt.home.dataStreamsTabTitle"
          defaultMessage="Data Streams"
        />
      ),
    },
    {
      id: Section.IndexTemplates,
      name: (
        <FormattedMessage
          id="xpack.idxMgmt.home.indexTemplatesTabTitle"
          defaultMessage="Index Templates"
        />
      ),
    },
    {
      id: Section.ComponentTemplates,
      name: (
        <FormattedMessage
          id="xpack.idxMgmt.home.componentTemplatesTabTitle"
          defaultMessage="Component Templates"
        />
      ),
    },
  ];

  if (capabilities.index_management.manageEnrichPolicies) {
    tabs.push({
      id: Section.EnrichPolicies,
      name: (
        <FormattedMessage
          id="xpack.idxMgmt.home.enrichPoliciesTabTitle"
          defaultMessage="Enrich Policies"
        />
      ),
    });
  }

  const onSectionChange = (newSection: Section) => {
    history.push(`/${newSection}`);
  };

  const indexManagementTabs = (
    <>
      <EuiPageHeader
        data-test-subj="indexManagementHeaderContent"
        pageTitle={
          <span data-test-subj="appTitle">
            <FormattedMessage id="xpack.idxMgmt.home.appTitle" defaultMessage="Index Management" />
          </span>
        }
        bottomBorder
        rightSideItems={[
          <EuiButtonEmpty
            href={documentationService.getIdxMgmtDocumentationLink()}
            target="_blank"
            iconType="help"
            data-test-subj="documentationLink"
          >
            <FormattedMessage
              id="xpack.idxMgmt.home.idxMgmtDocsLinkText"
              defaultMessage="Index Management docs"
            />
          </EuiButtonEmpty>,
        ]}
        tabs={tabs.map((tab) => ({
          onClick: () => onSectionChange(tab.id),
          isSelected: tab.id === section,
          key: tab.id,
          'data-test-subj': `${tab.id}Tab`,
          label: tab.name,
        }))}
      />

      <EuiSpacer size="l" />

      <Routes>
        <Route
          exact
          path={[`/${Section.DataStreams}`, `/${Section.DataStreams}/:dataStreamName?`]}
          component={DataStreamList}
        />
        <Route exact path={`/${Section.Indices}`} component={IndexList} />
        <Route
          exact
          path={[`/${Section.IndexTemplates}`, `/${Section.IndexTemplates}/:templateName?`]}
          component={TemplateList}
        />
        <Route
          exact
          path={[
            `/${Section.ComponentTemplates}`,
            `/${Section.ComponentTemplates}/:componentTemplateName?`,
          ]}
          component={ComponentTemplateList}
        />
        {capabilities.index_management.manageEnrichPolicies && (
          <Route exact path={`/${Section.EnrichPolicies}`} component={EnrichPoliciesList} />
        )}
      </Routes>
      {consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null}
    </>
  );
  return (
    <Routes>
      <Route path={`/${Section.Indices}/index_details`} component={IndexDetailsPage} />
      <Route render={() => indexManagementTabs} />
    </Routes>
  );
};
