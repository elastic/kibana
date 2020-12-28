/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPageBody,
  EuiPageContent,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { HttpStart, IUiSettingsClient } from 'kibana/public';
import React from 'react';
import { SessionsMgmtConfigSchema } from '../';
import { UISession } from '../../../../common/search/sessions_mgmt';
import { SearchSessionsMgmtAPI } from '../lib/api';
import { AsyncSearchIntroDocumentation } from '../lib/documentation';
import { TableText } from './';
import { SearchSessionsMgmtTable } from './table';

interface Props {
  documentation: AsyncSearchIntroDocumentation;
  api: SearchSessionsMgmtAPI;
  http: HttpStart;
  initialTable: UISession[] | null;
  uiSettings: IUiSettingsClient;
  config: SessionsMgmtConfigSchema;
}

export function SearchSessionsMgmtHome({ documentation, ...tableProps }: Props) {
  return (
    <EuiPageBody component="div">
      <EuiPageContent>
        <EuiFlexGroup>
          <EuiFlexItem grow={true}>
            <EuiTitle size="l">
              <h1>
                <FormattedMessage
                  id="xpack.data.mgmt.searchSessions.home.sectionTitle"
                  defaultMessage="Background Sessions"
                />
              </h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              href={documentation.getElasticsearchDocLink()}
              target="_blank"
              iconType="help"
            >
              <FormattedMessage
                id="xpack.data.mgmt.searchSessions.home.backgroundSessionsDocsLinkText"
                defaultMessage="Documentation"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <TableText>
          <p>
            <FormattedMessage
              id="xpack.data.mgmt.searchSessions.home.sectionDescription"
              defaultMessage="Manage the sessions that you have sent to the background."
            />
          </p>
        </TableText>

        <EuiHorizontalRule />

        <SearchSessionsMgmtTable data-test-subj="search-sessions-mgmt-table" {...tableProps} />
      </EuiPageContent>
    </EuiPageBody>
  );
}
