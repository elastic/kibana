/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAccordion, EuiButtonIcon, EuiLoadingKibana, EuiPanel, EuiTitle } from '@elastic/eui';
import { IPosition } from 'monaco-editor';
import queryString from 'querystring';
import React from 'react';
import ReactDOM from 'react-dom';
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
  private node: Element | undefined = undefined;
  constructor(props: Props) {
    super(props);
    this.state = {
      expanded: false,
    };
  }

  public close = () => {
    this.props.onClose();
  };
  public componentDidMount(): void {
    this.node = ReactDOM.findDOMNode(this) as Element;
  }

  public toggleExpand = () => {
    this.setState({ expanded: !this.state.expanded });
  };

  public render() {
    const body = this.props.isLoading ? <EuiLoadingKibana size="xl" /> : this.renderGroupByRepo();
    const styles: any = {};
    const expanded = this.state.expanded;
    if (expanded) {
      styles.position = 'absolute';
      styles.bottom = 0;
      styles.right = 0;
      if (this.node) {
        const parent = this.node.parentNode as Element;
        styles.width = parent.clientWidth;
        styles.height = parent.clientHeight - 75;
        styles.maxHeight = styles.height;
        styles.zIndex = 1000;
      }
    }
    return (
      <EuiPanel grow={false} className="code-editor-references-panel" style={styles}>
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
    return (
      <EuiAccordion
        id={repo}
        key={repo}
        buttonContentClassName="code-editor-reference-accordion-button"
        buttonContent={repo}
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
    return (
      <CodeBlock
        key={key}
        language={file.language}
        startLine={0}
        code={file.code}
        file={file.file}
        folding={false}
        lineNumbersFunc={lineNumberFn}
        highlightRanges={file.highlights}
        onClick={this.onCodeClick.bind(this, file.lineNumbers, file.uri)}
      />
    );
  }

  private onCodeClick(lineNumbers: string[], url: string, pos: IPosition) {
    const { uri } = parseSchema(url)!;
    const line = parseInt(lineNumbers[pos.lineNumber - 1], 10);
    if (!isNaN(line)) {
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
      history.push(`${uri}!L${line}:0?${query}`);
    }
  }
}
