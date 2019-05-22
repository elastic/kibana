/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { IPosition } from 'monaco-editor';
import React from 'react';
import { Link } from 'react-router-dom';

import { RepositoryUtils } from '../../../common/repository_utils';
import { history } from '../../utils/url';
import { CodeBlock } from '../codeblock/codeblock';

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
        <div key={`resultitem${key}`} data-test-subj="codeSearchResultList">
          <div style={{ marginBottom: '.5rem' }}>
            <Link to={repoLinkUrl}>
              <EuiFlexGroup
                direction="row"
                alignItems="center"
                justifyContent="flexStart"
                gutterSize="none"
              >
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="subdued">
                    {RepositoryUtils.orgNameFromUri(uri)}/
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="default">
                    <strong>{RepositoryUtils.repoNameFromUri(uri)}</strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </Link>
          </div>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="flexStart"
            gutterSize="xs"
            style={{ marginBottom: '1rem' }}
          >
            <EuiFlexItem grow={false}>
              <EuiBadge color="default">{hits}</EuiBadge>
            </EuiFlexItem>
            <EuiText size="s">
              &nbsp;hits from&nbsp;
              <Link to={fileLinkUrl} data-test-subj="codeSearchResultFileItem">
                {filePath}
              </Link>
            </EuiText>
          </EuiFlexGroup>
          <CodeBlock
            key={`code${key}`}
            language={item.language}
            startLine={0}
            code={content}
            highlightRanges={ranges}
            folding={false}
            lineNumbersFunc={lineMappingFunc}
            onClick={this.onCodeClick.bind(this, lineMapping, fileLinkUrl)}
          />
        </div>
      );
    });
  }

  private onCodeClick(lineNumbers: string[], fileUrl: string, pos: IPosition) {
    const line = parseInt(lineNumbers[pos.lineNumber - 1], 10);
    if (!isNaN(line)) {
      history.push(`${fileUrl}!L${line}:0`);
    }
  }
}
