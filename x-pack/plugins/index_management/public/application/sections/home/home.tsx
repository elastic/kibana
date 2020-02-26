/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
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
} from '@elastic/eui';
import { BASE_PATH } from '../../../../common/constants';
import { documentationService } from '../../services/documentation';
import { IndexList } from './index_list';
import { TemplateList } from './template_list';
import { breadcrumbService } from '../../services/breadcrumbs';

type Section = 'indices' | 'templates';

interface MatchParams {
  section: Section;
}

export const IndexManagementHome: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { section },
  },
  history,
}) => {
  const tabs = [
    {
      id: 'indices' as Section,
      name: <FormattedMessage id="xpack.idxMgmt.home.indicesTabTitle" defaultMessage="Indices" />,
    },
    {
      id: 'templates' as Section,
      name: (
        <FormattedMessage
          id="xpack.idxMgmt.home.indexTemplatesTabTitle"
          defaultMessage="Index Templates"
        />
      ),
    },
  ];

  const onSectionChange = (newSection: Section) => {
    history.push(`${BASE_PATH}${newSection}`);
  };

  useEffect(() => {
    breadcrumbService.setBreadcrumbs('home');
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
          </EuiFlexGroup>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiTabs>
          {tabs.map(tab => (
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
          <Route exact path={`${BASE_PATH}indices`} component={IndexList} />
          <Route exact path={`${BASE_PATH}indices/filter/:filter?`} component={IndexList} />
          <Route exact path={`${BASE_PATH}templates/:templateName*`} component={TemplateList} />
        </Switch>
      </EuiPageContent>
    </EuiPageBody>
  );
};
