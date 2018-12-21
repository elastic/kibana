/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { euiTextColor } from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

import { RepositoryUtils } from '../../../common/repository_utils';
import { CodeBlock } from '../codeblock/codeblock';

const OrgName = styled.span`
  color: ${euiTextColor};
`;

const RepoName = styled.span`
  color: ${euiTextColor};
  font-weight: bold;
`;

interface Props {
  results: any[];
}

export class CodeResult extends React.PureComponent<Props> {
  public render() {
    return this.props.results.map(item => {
      const { uri, filePath, hits, compositeContent } = item;
      const { content, lineMapping, ranges } = compositeContent;
      const repoLinkUrl = `/${uri}/tree/HEAD/`;
      const fileLinkUrl = `/${uri}/blob/HEAD/${filePath}`;
      const key = `${uri}${filePath}`;
      const lineMappingFunc = (l: number) => {
        return lineMapping[l - 1];
      };
      return (
        <div key={`resultitem${key}`}>
          <p style={{ marginBottom: '.5rem' }}>
            <Link to={repoLinkUrl}>
              <OrgName>{RepositoryUtils.orgNameFromUri(uri)}</OrgName>/
              <RepoName>{RepositoryUtils.repoNameFromUri(uri)}</RepoName>
            </Link>
          </p>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="flexStart"
            gutterSize="xs"
            style={{ marginBottom: '1rem' }}
          >
            <EuiFlexItem grow={false}>
              <EuiBadge color="default">{hits}</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>hits from</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <Link to={fileLinkUrl}>{filePath}</Link>
            </EuiFlexItem>
          </EuiFlexGroup>
          <CodeBlock
            key={`code${key}`}
            language={item.language}
            startLine={0}
            code={content}
            highlightRanges={ranges}
            folding={false}
            lineNumbersFunc={lineMappingFunc}
          />
        </div>
      );
    });
  }
}
