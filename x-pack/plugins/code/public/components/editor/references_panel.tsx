/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiAccordion,
  EuiButtonIcon,
  EuiLoadingKibana,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import classname from 'classnames';
import { IPosition } from 'monaco-editor';
import queryString from 'querystring';
import React from 'react';
import { parseSchema } from '../../../common/uri_util';
import { GroupedFileReferences, GroupedRepoReferences } from '../../actions';
import { history } from '../../utils/url';
import { CodeBlock } from '../codeblock/codeblock';

interface Props {
  isLoading: boolean;
  title: string;
  references: GroupedRepoReferences[];
  refUrl?: string;
  onClose(): void;
}
interface State {
  expanded: boolean;
}

export class ReferencesPanel extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      expanded: false,
    };
  }

  public close = () => {
    this.props.onClose();
  };

  public toggleExpand = () => {
    this.setState({ expanded: !this.state.expanded });
  };

  public render() {
    const body = this.props.isLoading ? <EuiLoadingKibana size="xl" /> : this.renderGroupByRepo();
    const styles: any = {};
    const expanded = this.state.expanded;
    return (
      <EuiPanel
        grow={false}
        className={classname(['code-editor-references-panel', expanded ? 'expanded' : ''])}
        style={styles}
      >
        <EuiButtonIcon
          size="s"
          onClick={this.toggleExpand}
          iconType={expanded ? 'arrowDown' : 'arrowUp'}
          aria-label="Next"
          className="expandButton"
        />
        {!expanded && (
          <EuiButtonIcon
            className="euiFlyout__closeButton"
            size="s"
            onClick={this.close}
            iconType="cross"
            aria-label="Next"
          />
        )}
        <EuiTitle size="s">
          <h3>{this.props.title}</h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <div className="code-auto-overflow-y">{body}</div>
      </EuiPanel>
    );
  }

  private renderGroupByRepo() {
    return this.props.references.map((ref: GroupedRepoReferences) => {
      return this.renderReferenceRepo(ref);
    });
  }

  private renderReferenceRepo({ repo, files }: GroupedRepoReferences) {
    const [org, name] = repo.split('/').slice(1);
    const buttonContent = (
      <span>
        <span>{org}</span>/<b>{name}</b>
      </span>
    );

    return (
      <EuiAccordion
        id={repo}
        key={repo}
        buttonContentClassName="code-editor-reference-accordion-button"
        buttonContent={buttonContent}
        paddingSize="s"
        initialIsOpen={true}
      >
        {files.map(file => this.renderReference(file))}
      </EuiAccordion>
    );
  }

  private renderReference(file: GroupedFileReferences) {
    const key = `${file.uri}`;
    const lineNumberFn = (l: number) => {
      return file.lineNumbers[l - 1];
    };
    const fileComponent = (
      <React.Fragment>
        <EuiText>
          <a href={`#${this.computeUrl(file.uri)}`}>{file.file}</a>
        </EuiText>
        <EuiSpacer size="s" />
      </React.Fragment>
    );

    return (
      <CodeBlock
        key={key}
        language={file.language}
        startLine={0}
        code={file.code}
        folding={false}
        lineNumbersFunc={lineNumberFn}
        highlightRanges={file.highlights}
        fileComponent={fileComponent}
        onClick={this.onCodeClick.bind(this, file.lineNumbers, file.uri)}
      />
    );
  }

  private onCodeClick(lineNumbers: string[], url: string, pos: IPosition) {
    const line = parseInt(lineNumbers[pos.lineNumber - 1], 10);
    history.push(this.computeUrl(url, line));
  }

  private computeUrl(url: string, line?: number) {
    const { uri } = parseSchema(url)!;
    let search = history.location.search;
    if (search.startsWith('?')) {
      search = search.substring(1);
    }
    const queries = queryString.parse(search);
    const query = queryString.stringify({
      ...queries,
      tab: 'references',
      refUrl: this.props.refUrl,
    });
    return line !== undefined ? `${uri}!L${line}:0?${query}` : `${uri}?${query}`;
  }
}
