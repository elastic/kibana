/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonEmpty,
  EuiLink,
  EuiLoadingContent,
  EuiPageHeader,
  EuiPopover,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { DataStreamList } from './data_stream_list';
import { IndexList } from './index_list';
import { TemplateList } from './template_list';
import { ComponentTemplateList } from '../../components/component_templates';
import { breadcrumbService } from '../../services/breadcrumbs';

export enum Section {
  Indices = 'indices',
  DataStreams = 'data_streams',
  IndexTemplates = 'templates',
  ComponentTemplates = 'component_templates',
}

export const homeSections = [
  Section.Indices,
  Section.DataStreams,
  Section.IndexTemplates,
  Section.ComponentTemplates,
];

interface MatchParams {
  section: Section;
}

interface DocsPreview {
  title: string;
  url: string;
  description: string;
}

export const IndexManagementHome: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { section },
  },
  history,
}) => {
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

  const onSectionChange = (newSection: Section) => {
    history.push(`/${newSection}`);
  };

  useEffect(() => {
    breadcrumbService.setBreadcrumbs('home');
  }, []);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const [docsPreview, setDocsPreview] = useState<DocsPreview>({
    title: '',
    url: '',
    description: '',
  });
  const onDocsButtonClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
    if (docsPreview.title === '' || docsPreview.description === '' || docsPreview.url === '') {
      $.ajax({
        url: 'https://raw.githubusercontent.com/elastic/built-docs/17ec08c679921ac1f6e1f8b1b5f63900d197b799/html/en/elasticsearch/reference/master/index-mgmt.html',
      }).done((unformattedResponse) => {
        const response = $.parseHTML(unformattedResponse);
        const metaTags = $(response).filter('meta');
        setDocsPreview({
          title: $(metaTags).filter('[property="og:title"]').attr('content') ?? '',
          url: $(metaTags).filter('[property="og:url"]').attr('content') ?? '',
          description: $(metaTags).filter('[property="og:description"]').attr('content') ?? '',
        });
      });
    }
  };
  const closePopover = () => setIsPopoverOpen(false);

  const docsButton = (
    <EuiButtonEmpty
      iconType="documentation"
      data-test-subj="documentationLink"
      onClick={onDocsButtonClick}
    >
      <FormattedMessage
        id="xpack.idxMgmt.home.idxMgmtDocsLinkText"
        defaultMessage="Index Management docs"
      />
    </EuiButtonEmpty>
  );

  const DocsPopover = () => (
    <EuiPopover
      panelStyle={{ width: 300 }}
      button={docsButton}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="downRight"
    >
      <EuiText id="doc-content">
        <h4>{docsPreview.title === '' ? <EuiLoadingContent lines={1} /> : docsPreview.title}</h4>
        <p>
          <EuiLink href={docsPreview.url} target="_blank" external>
            {docsPreview.url === '' ? (
              <EuiLoadingContent lines={1} />
            ) : (
              docsPreview.url.substring(0, 28) + '...'
            )}
          </EuiLink>
        </p>
        <p>
          {docsPreview.description === '' ? (
            <EuiLoadingContent lines={4} />
          ) : (
            docsPreview.description.substring(0, 115) + '...'
          )}
        </p>
      </EuiText>
    </EuiPopover>
  );

  return (
    <>
      <EuiPageHeader
        data-test-subj="indexManagementHeaderContent"
        pageTitle={
          <span data-test-subj="appTitle">
            <FormattedMessage id="xpack.idxMgmt.home.appTitle" defaultMessage="Index Management" />
          </span>
        }
        bottomBorder
        rightSideItems={[<DocsPopover />]}
        tabs={tabs.map((tab) => ({
          onClick: () => onSectionChange(tab.id),
          isSelected: tab.id === section,
          key: tab.id,
          'data-test-subj': `${tab.id}Tab`,
          label: tab.name,
        }))}
      />

      <EuiSpacer size="l" />

      <Switch>
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
      </Switch>
    </>
  );
};
