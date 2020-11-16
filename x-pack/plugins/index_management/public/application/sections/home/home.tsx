/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageBody,
  EuiPageContent,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
  EuiButton,
} from '@elastic/eui';
import { RuntimeField } from '../../../../../runtime_fields/public';
import { documentationService } from '../../services/documentation';
import { DataStreamList } from './data_stream_list';
import { IndexList } from './index_list';
import { TemplateList } from './template_list';
import { ComponentTemplateList } from '../../components/component_templates';
import { breadcrumbService } from '../../services/breadcrumbs';
import { useAppContext } from '../../app_context';

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

const defaultRuntimeField: RuntimeField = { name: 'myField', type: 'date', script: 'test=123' };

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

  const {
    plugins: { runtimeFields },
  } = useAppContext();

  const closeRuntimeFieldEditor = useRef(() => {});

  const onSaveRuntimeField = useCallback((field: RuntimeField) => {
    console.log('Updated field', field); //  eslint-disable-line
  }, []);

  const openRuntimeFieldEditor = useCallback(async () => {
    const { openEditor } = await runtimeFields.loadEditor();
    closeRuntimeFieldEditor.current = openEditor({
      onSave: onSaveRuntimeField,
      // defaultValue: defaultRuntimeField,
    });
  }, [onSaveRuntimeField, runtimeFields]);

  useEffect(() => {
    breadcrumbService.setBreadcrumbs('home');

    return () => {
      closeRuntimeFieldEditor.current();
    };
  }, []);

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="l">
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={true}>
              <h1 data-test-subj="appTitle">
                <FormattedMessage
                  id="xpack.idxMgmt.home.appTitle"
                  defaultMessage="Index Management"
                />
              </h1>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
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
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={openRuntimeFieldEditor} fill>
                Create field
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiTabs>
          {tabs.map((tab) => (
            <EuiTab
              onClick={() => onSectionChange(tab.id)}
              isSelected={tab.id === section}
              key={tab.id}
              data-test-subj={`${tab.id}Tab`}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>

        <EuiSpacer size="m" />

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
      </EuiPageContent>
    </EuiPageBody>
  );
};
